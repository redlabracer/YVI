import express from 'express'
import cors from 'cors'
import { join } from 'path'
import customerRoutes from './routes/customer.routes'
import vehicleRoutes from './routes/vehicle.routes'
import historyRoutes from './routes/history.routes'
import templateRoutes from './routes/template.routes'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors()) // Erlaubt Zugriff von anderen Geräten (Handy, PC)
app.use(express.json())

// --- SICHERHEIT: Passwortschutz (Basic Auth) ---
// Damit niemand Fremdes auf Ihre Daten zugreifen kann
app.use((req, res, next) => {
  // Standard-Zugangsdaten: Benutzer="admin", Passwort="123"
  // BITTE ÄNDERN SIE DIESE DATEN VOR DEM EINSATZ IM INTERNET!
  const validUser = process.env.AUTH_USER || 'Terhaag'
  const validPass = process.env.AUTH_PASS || 'terhaag'

  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Werkstatt Login"')
    return res.status(401).send('Authentifizierung erforderlich')
  }

  // Entschlüssele den Header
  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':')
  const user = auth[0]
  const pass = auth[1]

  if (user === validUser && pass === validPass) {
    return next()
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Werkstatt Login"')
    return res.status(401).send('Falsches Passwort')
  }
})
// ------------------------------------------------

// Statische Dateien (für Bilder/Uploads)
app.use('/uploads', express.static(join(__dirname, '../../uploads')))

// API Routen einbinden
app.use('/api/customers', customerRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/templates', templateRoutes)

// Frontend ausliefern (Die App selbst)
// Wir gehen davon aus, dass der 'out/renderer' Ordner existiert (durch npm run build)
const frontendPath = join(__dirname, '../../out/renderer')
app.use(express.static(frontendPath))

// Alle anderen Anfragen an das Frontend weiterleiten (für React Router)
// Fix für Express 5 / path-to-regexp: Statt '*' nutzen wir eine Regex oder fangen alles in 'use'
app.use((req, res, next) => {
  // Wenn die API schon behandelt wurde, sind wir hier flasch. Aber app.use greift immer.
  // Prüfen ob es eine API Anfrage ist
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next()
  }
  
  // Wenn Datei nicht gefunden, index.html senden (SPA Fallback)
  // Express static hat vorher schon versucht die Datei zu finden.
  res.sendFile(join(frontendPath, 'index.html'))
})

// Start Server
export const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`)
    console.log(`📱 Handy Zugriff unter: http://<IP-DES-SERVERS>:${PORT}`)
  })
}

// Wenn diese Datei direkt ausgeführt wird (auf dem Thin Client)
if (require.main === module) {
  startServer()
}

export default app
