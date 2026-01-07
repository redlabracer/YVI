/*
  Warnings:

  - You are about to drop the `Part` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "tireStorageSpot" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Part";
PRAGMA foreign_keys=on;
