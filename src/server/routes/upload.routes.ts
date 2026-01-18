import { Router } from 'express'
import multer from 'multer'
import { join, extname } from 'path'
import fs from 'fs'

const router = Router()

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = join(__dirname, '../../../uploads')
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname))
  }
})

const upload = multer({ storage })

// POST /api/upload
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  
  // Return the path relative to the server (accessible via /uploads/filename)
  // Our static serve is on /uploads
  const filePath = `/uploads/${req.file.filename}`
  
  res.json({ 
    path: filePath,
    filename: req.file.filename,
    originalName: req.file.originalname 
  })
})

export default router
