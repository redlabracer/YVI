import { Request, Response } from 'express';
import prisma from '../db';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { join, extname } from 'path';
import fs from 'fs';
import multer from 'multer';

// Globaler Index für Round-robin Key Rotation (Google Gemini)
let googleKeyIndex = 0;

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

// Analyze registration document with AI (OpenAI or Google Gemini)
export const analyzeRegistrationDoc = async (req: Request, res: Response) => {
  try {
    const { extractCustomerData } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    // Get Settings
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      return res.status(500).json({ error: 'Systemfehler: Keine Einstellungen gefunden.' });
    }

    const aiProvider = settings.aiProvider || 'openai';

    // Read file and convert to base64
    const fileBuffer = fs.readFileSync(file.path);
    const base64Image = fileBuffer.toString('base64');
    const extension = extname(file.originalname).toLowerCase();
    
    let mimeType = 'image/jpeg';
    if (extension === '.png') mimeType = 'image/png';
    if (extension === '.webp') mimeType = 'image/webp';
    if (extension === '.gif') mimeType = 'image/gif';

    if (extension === '.pdf') {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'PDF-Dateien werden aktuell nicht unterstützt. Bitte verwenden Sie ein Foto (JPG/PNG).' });
    }

    const vehicleDataInstruction = `
Section 2: Fahrzeugdaten (Vehicle Data)
Kennzeichen (License Plate)
Source Field: Code A.
Location: Top left.
Instruction: Extract the alphanumeric string found in the box labeled A.
Example: "SP MQ 16".
FIN (Fahrzeugidentifikationsnummer / VIN)
Source Field: Code E.
Instruction: Extract the long alphanumeric string labeled E.
Example: "KNARH81GB..."
Marke (Brand)
Source Field: Code D.1.
Instruction: Extract the manufacturer name labeled D.1.
Example: "Kia".
Modell (Model)
Source Field: Code D.3.
Instruction: Extract the commercial description labeled D.3.
Example: "SORENTO".
HSN (4-Digits)
Source Field: Code 2.1.
Instruction: Extract the 4-digit code.
Example: "8253".
TSN (3-Digits)
Source Field: Code 2.2.
Instruction: Extract the first 3 characters.
Example: "AIP".
Erstzulassung (First Registration)
Source Field: Code B.
Instruction: Extract date labeled B.
Example: "21.10.2020".
Kraftstoff (Fuel Type)
Source Field: Code P.3.
Instruction: Extract the text description labeled P.3.
`;

    const personalDataInstruction = `
Section 1: Persönliche Daten (Personal Data)
Vorname (First Name) / Nachname (Last Name)
Source Field: Codes C.1.1 / C.1.2.
Instruction: Extract Last Name/Company under C.1.1. Extract First Name under C.1.2.
Anschrift (Address)
Source Field: Code C.1.3.
Instruction: Extract street, zip, city.
`;

    let systemPrompt = "Du bist ein Assistent für eine KFZ-Werkstatt. Analysiere das Bild eines Fahrzeugscheins und extrahiere die Daten.\n";
    if (extractCustomerData === 'true' || extractCustomerData === true) {
      systemPrompt += personalDataInstruction + "\n" + vehicleDataInstruction;
      systemPrompt += `\nAntworte NUR im JSON-Format: { "make": "...", "model": "...", "licensePlate": "...", "vin": "...", "hsn": "...", "tsn": "...", "firstRegistration": "YYYY-MM-DD", "fuelType": "...", "firstName": "...", "lastName": "...", "address": "..." }`;
    } else {
      systemPrompt += vehicleDataInstruction;
      systemPrompt += `\nAntworte NUR im JSON-Format: { "make": "...", "model": "...", "licensePlate": "...", "vin": "...", "hsn": "...", "tsn": "...", "firstRegistration": "YYYY-MM-DD", "fuelType": "..." }`;
    }

    let result = {};

    if (aiProvider === 'google') {
      // --- GOOGLE GEMINI IMPLEMENTATION ---
      if (!settings.googleApiKey) {
        return res.status(400).json({ error: 'Kein Google AI API Key in den Einstellungen gefunden.' });
      }

      // Parse keys (split by newline, comma, or whitespace)
      let rawInput = settings.googleApiKey;
      rawInput = rawInput.replace(/[\[\]]/g, ''); // Remove JSON brackets if presents
      
      const finalApiKeys = rawInput
        .split(/[\n,\s]+/)
        .map(k => k.trim())
        .map(k => k.replace(/['"]/g, ''))
        .filter(k => k.length > 20);

      if (finalApiKeys.length === 0) {
        return res.status(400).json({ error: 'Kein gültiger Google AI Key gefunden.' });
      }

      // Use selected model or default to gemini-2.0-flash
      const modelName = settings.googleModel || 'gemini-2.0-flash'; 
      console.log(`[AI] Using Google Model: ${modelName} with ${finalApiKeys.length} available keys`);

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        },
      };

      let lastError = null;
      let success = false;
      let resultText = '';

      // Round-robin / Failover logic
      const startIndex = googleKeyIndex % finalApiKeys.length;
      googleKeyIndex = (googleKeyIndex + 1) % finalApiKeys.length;

      for (let attempt = 0; attempt < finalApiKeys.length; attempt++) {
        const i = (startIndex + attempt) % finalApiKeys.length;
        const currentKey = finalApiKeys[i];
        
        // Create instance for THIS key
        const genAI = new GoogleGenerativeAI(currentKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        try {
          console.log(`[AI] Sending request to Google Gemini (${modelName}) using Key #${i+1}...`);
          const aiResponse = await model.generateContent([systemPrompt, imagePart]);
          resultText = aiResponse.response.text();
          success = true;
          break; // Success!
        } catch (error: any) {
          console.warn(`[AI] Key #${i+1} failed: ${error.message}`);
          lastError = error;

          const isRateLimit = error.status === 429 || 
                              error.message?.includes('429') || 
                              error.message?.includes('Quota') || 
                              error.message?.includes('limit');

          if (isRateLimit) {
              console.log(`[AI] Rate Limit hit for Key #${i+1}. Switching...`);
          } else {
              console.log(`[AI] Error for Key #${i+1}. Switching anyway...`);
          }
          
          if (attempt < finalApiKeys.length - 1) {
             await new Promise(r => setTimeout(r, 1000)); 
          }
        }
      }

      if (!success) {
        throw lastError || new Error('Alle Google API Keys sind fehlgeschlagen.');
      }
      
      // Clean up markdown code blocks if Gemini adds them
      const jsonStr = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(jsonStr);

    } else {
      // --- OPENAI IMPLEMENTATION ---
      if (!settings.openaiKey) {
        return res.status(400).json({ error: 'Kein OpenAI API Key in den Einstellungen gefunden.' });
      }
      const openai = new OpenAI({ apiKey: settings.openaiKey });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrahiere die Daten aus diesem Dokument:" },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });
      const content = response.choices[0].message.content;
      result = JSON.parse(content || '{}');
    }

    // Helper function to convert text to Proper Case (Title Case)
    const toProperCase = (str: string): string => {
      if (!str) return str;
      return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // Normalize names and address to Proper Case
    if (result.firstName) result.firstName = toProperCase(result.firstName);
    if (result.lastName) result.lastName = toProperCase(result.lastName);
    if (result.address) result.address = toProperCase(result.address);
    if (result.make) result.make = toProperCase(result.make);
    if (result.model) result.model = result.model.toUpperCase();
    if (result.licensePlate) {
      result.licensePlate = result.licensePlate.toUpperCase().replace(/\s+/g, ' ').trim();
    }

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.json(result);

  } catch (error: any) {
    console.error('Error analyzing document:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (error.status === 429) return res.status(429).json({ error: 'AI Quote überschritten (Rate Limit).' });
    if (error.status === 401) return res.status(401).json({ error: 'Ungültiger API-Key.' });
    
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
