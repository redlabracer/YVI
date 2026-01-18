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

// POST /api/documents/analyze - Analyze registration document with OpenAI
router.post('/analyze', upload.single('file'), analyzeRegistrationDoc);

// POST /api/documents/customer - Add documents to a customer
router.post('/customer', upload.array('files', 10), addCustomerDocuments);

// GET /api/documents/:id/url - Get document URL for viewing
router.get('/:id/url', getDocumentUrl);

export default router;
