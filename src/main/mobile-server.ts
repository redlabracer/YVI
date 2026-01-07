import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { networkInterfaces } from 'os'
import { join, extname } from 'path'
import { app, BrowserWindow } from 'electron'
import { Server } from 'http'
import { promises as fs } from 'fs'
import localtunnel from 'localtunnel'
import axios from 'axios'

let server: Server | null = null
let tunnel: localtunnel.Tunnel | null = null
const PORT = 3456 // Fixed port or dynamic

export const startMobileServer = async (mainWindow: BrowserWindow): Promise<{ url: string, publicIp?: string }> => {
  if (server) {
    await stopMobileServer()
  }

  const expressApp = express()
  expressApp.use(cors())
  // Important: Trust proxy for localtunnel
  expressApp.set('trust proxy', 1) 

  // Configure storage
  const storage = multer.diskStorage({
    destination: async function (_req, _file, cb) {
      const uploadDir = join(app.getPath('userData'), 'mobile-uploads')
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    },
    filename: function (_req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname))
    }
  })

  const upload = multer({ storage: storage })

  // Serve upload page
  expressApp.get('/', (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Foto hochladen</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f2f5; }
          .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; width: 90%; max-width: 400px; }
          h1 { margin-top: 0; color: #1a1a1a; }
          p { color: #666; margin-bottom: 2rem; }
          .upload-btn { background: #2563eb; color: white; padding: 1rem 2rem; border-radius: 0.5rem; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: block; width: 100%; box-sizing: border-box; text-decoration: none; border: none; margin-bottom: 1rem; }
          .upload-btn.secondary { background: #4b5563; }
          .upload-btn:active { transform: scale(0.98); }
          input[type="file"] { display: none; }
          .success { color: #059669; display: none; }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; display: none; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card" id="uploadCard">
          <h1>Dokument scannen</h1>
          <p>Machen Sie ein Foto vom Fahrzeugschein oder wählen Sie eine Datei aus.</p>
          
          <label class="upload-btn">
            📷 Kamera öffnen
            <input type="file" id="cameraInput" accept="image/*" capture="environment">
          </label>
          
          <label class="upload-btn secondary">
            🖼️ Aus Galerie wählen
            <input type="file" id="fileInput" accept="image/*">
          </label>

          <div class="spinner" id="spinner"></div>
        </div>
        <div class="card success" id="successCard">
          <svg style="width: 64px; height: 64px; margin-bottom: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          <h1>Erfolgreich!</h1>
          <p>Das Bild wurde an den PC übertragen.</p>
          <button onclick="location.reload()" class="upload-btn" style="background: #4b5563; margin-top: 1rem;">Weiteres Bild</button>
        </div>

        <script>
          const cameraInput = document.getElementById('cameraInput');
          const fileInput = document.getElementById('fileInput');
          const uploadCard = document.getElementById('uploadCard');
          const successCard = document.getElementById('successCard');
          const spinner = document.getElementById('spinner');

          const handleUpload = async (file) => {
            const formData = new FormData();
            formData.append('photo', file);

            spinner.style.display = 'block';
            
            try {
              const response = await fetch('/upload', {
                method: 'POST',
                body: formData
              });
              
              if (response.ok) {
                uploadCard.style.display = 'none';
                successCard.style.display = 'block';
              } else {
                alert('Fehler beim Hochladen');
              }
            } catch (err) {
              alert('Verbindungsfehler: ' + err.message);
            } finally {
              spinner.style.display = 'none';
              cameraInput.value = '';
              fileInput.value = '';
            }
          };

          cameraInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleUpload(e.target.files[0]);
          });

          fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleUpload(e.target.files[0]);
          });
        </script>
      </body>
      </html>
    `)
  })

  expressApp.post('/upload', upload.single('photo'), (req, res) => {
    if (req.file) {
      mainWindow.webContents.send('mobile-file-uploaded', req.file.path)
      res.json({ success: true })
    } else {
      res.status(400).json({ error: 'No file uploaded' })
    }
  })

  return new Promise((resolve, reject) => {
    server = expressApp.listen(PORT, '0.0.0.0', async () => {
      try {
        // Try to start localtunnel
        tunnel = await localtunnel({ port: PORT })
        console.log('Tunnel started at:', tunnel.url)
        
        // Fetch public IP for password
        let publicIp = ''
        try {
          const ipRes = await axios.get('https://api.ipify.org?format=json')
          publicIp = ipRes.data.ip
        } catch (e) {
          console.error('Failed to fetch public IP', e)
        }

        resolve({ url: tunnel.url, publicIp })
      } catch (err) {
        console.error('Tunnel failed, falling back to local IP:', err)
        const ip = getLocalIp()
        resolve({ url: `http://${ip}:${PORT}` })
      }
    })
    server.on('error', (err) => reject(err))
  })
}

export const stopMobileServer = async () => {
  if (tunnel) {
    tunnel.close()
    tunnel = null
  }
  if (server) {
    return new Promise<void>((resolve) => {
      server?.close(() => {
        server = null
        resolve()
      })
    })
  }
}

function getLocalIp() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}
