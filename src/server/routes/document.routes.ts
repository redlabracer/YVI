import { Router } from 'express';
import multer from 'multer';
import { join, extname } from 'path';
import fs from 'fs';
import { 
  analyzeRegistrationDoc, 
  addCustomerDocuments, 
  getDocumentUrl 
} from '../controllers/document.controller';

const router = Router();

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = join(__dirname, '../../../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + extname(file.originalname));
  }
});

const upload = multer({ storage });
const analyzeUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype) && ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      return cb(null, true);
    }
    cb(new Error('Nur Bilddateien (JPG/PNG/WEBP/GIF) sind für die Analyse erlaubt.'));
  },
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1
  }
});

const analyzeUploadMiddleware = (req: any, res: any, next: any) => {
  analyzeUpload.single('file')(req, res, (err: any) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Datei zu groß. Maximal 8 MB erlaubt.' });
      }
      return res.status(400).json({ error: `Upload-Fehler: ${err.message}` });
    }

    return res.status(400).json({ error: err.message || 'Ungültiger Upload.' });
  });
};

// POST /api/documents/analyze - Analyze registration document with OpenAI
router.post('/analyze', analyzeUploadMiddleware, analyzeRegistrationDoc);

// POST /api/documents/customer - Add documents to a customer
router.post('/customer', upload.array('files', 10), addCustomerDocuments);

// GET /api/documents/:id/url - Get document URL for viewing
router.get('/:id/url', getDocumentUrl);

export default router;
