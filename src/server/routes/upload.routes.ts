import { Router } from 'express'
import multer from 'multer'
import { join, extname } from 'path'
import fs from 'fs'
import crypto from 'crypto'

const router = Router()

// Security: Allowed file types (whitelist)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt']

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
    // Security: Generate cryptographically secure random filename
    const uniqueSuffix = crypto.randomUUID()
    const ext = extname(file.originalname).toLowerCase()
    cb(null, file.fieldname + '-' + uniqueSuffix + ext)
  }
})

// Security: File filter to validate file types
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = extname(file.originalname).toLowerCase()
  
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`Dateityp nicht erlaubt: ${file.mimetype} (${ext}). Erlaubt: ${ALLOWED_EXTENSIONS.join(', ')}`))
  }
}

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10 // Max 10 files per request
  }
})

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
