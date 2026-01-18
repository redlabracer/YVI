import { PrismaClient } from '@prisma/client'

// Wir nutzen die existierende Prisma-Client-Instanz oder erstellen eine neue
// Für den Standalone-Server erstellen wir eine neue.
const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

// Test connection on startup
prisma.$connect()
  .then(() => console.log('✅ Datenbank verbunden'))
  .catch((err) => console.error('❌ Datenbankfehler:', err))

export default prisma
