import { PrismaClient } from '@prisma/client'

// Wir nutzen die existierende Prisma-Client-Instanz oder erstellen eine neue
// Für den Standalone-Server erstellen wir eine neue.
const prisma = new PrismaClient()

export default prisma
