import { logger } from './logger'
import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

// Initialize Prisma for migrations
function getPrismaClient() {
  const dbPath = is.dev 
    ? 'file:./dev.db' 
    : `file:${join(app.getPath('userData'), 'database.db')}`
  
  return new PrismaClient({
    datasources: { db: { url: dbPath } }
  })
}

// SQL statements for creating all tables (idempotent - uses IF NOT EXISTS)
const migrationSQL = `
-- Customer table
CREATE TABLE IF NOT EXISTS "Customer" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "lexwareId" TEXT,
  "tireStorageSpot" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_lexwareId_key" ON "Customer"("lexwareId");

-- Vehicle table
CREATE TABLE IF NOT EXISTS "Vehicle" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "vin" TEXT NOT NULL,
  "licensePlate" TEXT NOT NULL,
  "make" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "hsn" TEXT,
  "tsn" TEXT,
  "firstRegistration" DATETIME,
  "mileage" INTEGER,
  "fuelType" TEXT,
  "transmission" TEXT,
  "registrationDoc" TEXT,
  "notes" TEXT,
  "customerId" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_vin_key" ON "Vehicle"("vin");

-- Document table
CREATE TABLE IF NOT EXISTS "Document" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'manual',
  "lexwareId" TEXT,
  "customerId" INTEGER NOT NULL,
  "serviceRecordId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Document_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Document_lexwareId_key" ON "Document"("lexwareId");

-- ServiceRecord table
CREATE TABLE IF NOT EXISTS "ServiceRecord" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" TEXT NOT NULL,
  "mileage" INTEGER,
  "cost" REAL,
  "lexwareId" TEXT,
  "customerId" INTEGER NOT NULL,
  "vehicleId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceRecord_lexwareId_key" ON "ServiceRecord"("lexwareId");

-- Todo table
CREATE TABLE IF NOT EXISTS "Todo" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "title" TEXT NOT NULL,
  "isDone" INTEGER NOT NULL DEFAULT 0,
  "customerId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Todo_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS "Settings" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "apiKey" TEXT,
  "openaiKey" TEXT,
  "openaiModel" TEXT DEFAULT 'gpt-4o-mini',
  "aiPrompt" TEXT,
  "carPartsUser" TEXT,
  "carPartsPass" TEXT,
  "conradUser" TEXT,
  "conradPass" TEXT,
  "lexwareUser" TEXT,
  "lexwarePass" TEXT,
  "syncEnabled" INTEGER NOT NULL DEFAULT 0,
  "autoSync" INTEGER NOT NULL DEFAULT 0,
  "lastSync" DATETIME,
  "theme" TEXT NOT NULL DEFAULT 'dark'
);

-- ServiceTemplate table
CREATE TABLE IF NOT EXISTS "ServiceTemplate" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Appointment table
CREATE TABLE IF NOT EXISTS "Appointment" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "title" TEXT NOT NULL,
  "start" DATETIME NOT NULL,
  "end" DATETIME NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "customerId" INTEGER,
  "vehicleId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Appointment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ShopClosure table
CREATE TABLE IF NOT EXISTS "ShopClosure" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "start" DATETIME NOT NULL,
  "end" DATETIME NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TireStorageSpot table
CREATE TABLE IF NOT EXISTS "TireStorageSpot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "label" TEXT,
  "status" TEXT,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to existing Settings table (will fail silently if already exists)
ALTER TABLE "Settings" ADD COLUMN "openaiModel" TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE "Settings" ADD COLUMN "aiPrompt" TEXT;
`

export async function runMigrations(): Promise<boolean> {
  const prisma = getPrismaClient()
  
  try {
    logger.info('Running database migrations...')
    
    // Execute all CREATE TABLE IF NOT EXISTS statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement)
      } catch (err) {
        // Ignore errors for indexes that already exist
        const errorMsg = String(err)
        if (!errorMsg.includes('already exists')) {
          logger.warn('Migration statement warning: ' + statement.substring(0, 50) + ' - ' + errorMsg)
        }
      }
    }
    
    // Ensure at least one Settings row exists
    const settingsCount = await prisma.settings.count()
    if (settingsCount === 0) {
      await prisma.settings.create({ data: { theme: 'dark' } })
      logger.info('Created default settings row')
    }
    
    logger.info('Database migrations completed successfully')
    await prisma.$disconnect()
    return true
  } catch (error) {
    logger.error('Database migration error:', error)
    await prisma.$disconnect()
    return false
  }
}
