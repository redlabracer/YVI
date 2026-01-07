/*
  Warnings:

  - You are about to drop the column `vehicleId` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "conradPass" TEXT;
ALTER TABLE "Settings" ADD COLUMN "conradUser" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
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
INSERT INTO "new_Document" ("createdAt", "customerId", "id", "lexwareId", "name", "path", "serviceRecordId", "type") SELECT "createdAt", "customerId", "id", "lexwareId", "name", "path", "serviceRecordId", "type" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_lexwareId_key" ON "Document"("lexwareId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
