import { Request, Response } from 'express';
import prisma from '../db';
import OpenAI from 'openai';
import { join, extname } from 'path';
import fs from 'fs';
import multer from 'multer';

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

export const upload = multer({ storage });

// Analyze registration document with OpenAI Vision
export const analyzeRegistrationDoc = async (req: Request, res: Response) => {
  try {
    const { extractCustomerData } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    // Get OpenAI key from settings
    const settings = await prisma.settings.findFirst();
    if (!settings || !settings.openaiKey) {
      return res.status(400).json({ error: 'Kein OpenAI API Key in den Einstellungen gefunden.' });
    }

    const openai = new OpenAI({ apiKey: settings.openaiKey });

    // Read file and convert to base64
    const fileBuffer = fs.readFileSync(file.path);
    const base64Image = fileBuffer.toString('base64');
    const extension = extname(file.originalname).toLowerCase();

    let mimeType = 'image/jpeg';
    if (extension === '.png') mimeType = 'image/png';
    if (extension === '.webp') mimeType = 'image/webp';
    if (extension === '.gif') mimeType = 'image/gif';

    if (extension === '.pdf') {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'PDF-Dateien werden aktuell nicht für den KI-Scan unterstützt. Bitte verwenden Sie ein Foto (JPG/PNG).' });
    }

    const vehicleDataInstruction = `
Section 2: Fahrzeugdaten (Vehicle Data)
Kennzeichen (License Plate)
Source Field: Code A.
Location: Top left of the document (under "Amtliches Kennzeichen") or inside the first box of the main grid.
Instruction: Extract the alphanumeric string found in the box labeled A.
Example value in image: "SP MQ 16".
FIN (Fahrzeugidentifikationsnummer / VIN)
Source Field: Code E.
Location: Top row of the central data grid, just below the license plate date.
Instruction: Extract the long alphanumeric string labeled E.
Example value in image: "KNARH81GB..."
Marke (Brand)
Source Field: Code D.1.
Location: Second row of the central data grid.
Instruction: Extract the manufacturer name labeled D.1.
Example value in image: "Kia".
Modell (Model)
Source Field: Code D.3.
Location: Fourth row of the central data grid (below D.2).
Instruction: Extract the commercial description labeled D.3.
Example value in image: "SORENTO".
HSN (4-stellig)
Source Field: Code 2.1.
Location: Top row of the central data grid, center column.
Instruction: Extract the 4-digit numeric code labeled 2.1.
Example value in image: "8253".
TSN (3-stellig)
Source Field: Code 2.2.
Location: Top row of the central data grid, right column.
Instruction: Extract the first 3 characters of the code labeled 2.2.
Example value in image: "AIP" (Full value is AIP000047).
Erstzulassung (First Registration)
Source Field: Code B.
Location: Top left corner of the central data grid (highlighted in red in the source image).
Instruction: Extract the date found in the box labeled B.
Example value in image: "21.10.2020".
Kraftstoff (Fuel Type)
Source Field: Code P.3.
Location: Lower half of the central data grid, left side.
Instruction: Extract the text description labeled P.3.
Example value in image: "Hybr.Benzin/E" (Hybrid Petrol/Electric).
`;

    const personalDataInstruction = `
Section 1: Persönliche Daten (Personal Data)
Vorname (First Name) / Nachname (Last Name)
Source Field: Codes C.1.1 (Last Name/Company) and C.1.2 (First Name).
Location: Left column, middle section.
Instruction: Extract the text under C.1.1 for the Last Name or Company Name. If a personal name exists under C.1.2, use that for First Name.
Example value in image: "Autohaus Bellemann GmbH" (Company name).
Anschrift (Address)
Source Field: Code C.1.3.
Location: Left column, lower section.
Instruction: Extract the street, postal code, and city found under C.1.3.
Example value in image: "Tullastr. 10, 67346 Speyer".
Telefon / Mobil
Instruction: Do not extract. This information is not present on the registration document.
`;

    let systemPrompt = "Du bist ein Assistent für eine KFZ-Werkstatt. Analysiere das Bild eines Fahrzeugscheins und extrahiere die Daten basierend auf folgenden Instruktionen:\n";

    if (extractCustomerData === 'true' || extractCustomerData === true) {
      systemPrompt += personalDataInstruction + "\n" + vehicleDataInstruction;
      systemPrompt += `\nAntworte NUR im JSON-Format: { "make": "...", "model": "...", "licensePlate": "...", "vin": "...", "hsn": "...", "tsn": "...", "firstRegistration": "YYYY-MM-DD", "fuelType": "...", "firstName": "...", "lastName": "...", "address": "..." }`;
    } else {
      systemPrompt += vehicleDataInstruction;
      systemPrompt += `\nAntworte NUR im JSON-Format: { "make": "...", "model": "...", "licensePlate": "...", "vin": "...", "hsn": "...", "tsn": "...", "firstRegistration": "YYYY-MM-DD", "fuelType": "..." }`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrahiere die Daten aus diesem Dokument:" },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(content || '{}');

    // Clean up uploaded file after processing
    fs.unlinkSync(file.path);

    res.json(result);
  } catch (error: any) {
    console.error('Error analyzing document:', error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.status === 429) {
      return res.status(429).json({ error: 'OpenAI Quote überschritten: Bitte prüfen Sie Ihr Guthaben oder Ihre API-Limits bei OpenAI.' });
    }
    if (error.status === 401) {
      return res.status(401).json({ error: 'Ungültiger OpenAI API-Key. Bitte prüfen Sie die Einstellungen.' });
    }
    res.status(500).json({ error: 'Fehler bei der Dokumentenanalyse: ' + error.message });
  }
};

// Add documents to customer
export const addCustomerDocuments = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const documents = [];
    for (const file of files) {
      const doc = await prisma.document.create({
        data: {
          name: file.originalname,
          path: `/uploads/documents/${file.filename}`,
          type: 'manual',
          customerId: parseInt(customerId)
        }
      });
      documents.push(doc);
    }

    res.json({ success: true, documents });
  } catch (error) {
    console.error('Error adding customer documents:', error);
    res.status(500).json({ error: 'Failed to add documents' });
  }
};

// Get document URL (for opening/downloading)
export const getDocumentUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // If path starts with /, it's a server path, return as-is
    // Otherwise, it's a local file path (from Electron), which won't work
    if (document.path.startsWith('/uploads')) {
      res.json({ url: document.path });
    } else {
      res.status(400).json({ error: 'This document is stored locally on another device and cannot be accessed remotely.' });
    }
  } catch (error) {
    console.error('Error getting document URL:', error);
    res.status(500).json({ error: 'Failed to get document URL' });
  }
};
