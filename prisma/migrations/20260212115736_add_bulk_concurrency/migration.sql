-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "apiKey" TEXT,
    "openaiKey" TEXT,
    "openaiModel" TEXT DEFAULT 'gpt-4o-mini',
    "googleApiKey" TEXT,
    "googleModel" TEXT DEFAULT 'gemini-2.0-flash',
    "aiProvider" TEXT DEFAULT 'openai',
    "aiPrompt" TEXT,
    "bulkAnalysisConcurrency" INTEGER NOT NULL DEFAULT 5,
    "carPartsUser" TEXT,
    "carPartsPass" TEXT,
    "conradUser" TEXT,
    "conradPass" TEXT,
    "lexwareUser" TEXT,
    "lexwarePass" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoSync" BOOLEAN NOT NULL DEFAULT false,
    "lastSync" DATETIME,
    "theme" TEXT NOT NULL DEFAULT 'dark'
);
INSERT INTO "new_Settings" ("aiPrompt", "aiProvider", "apiKey", "autoSync", "carPartsPass", "carPartsUser", "conradPass", "conradUser", "googleApiKey", "googleModel", "id", "lastSync", "lexwarePass", "lexwareUser", "openaiKey", "openaiModel", "syncEnabled", "theme") SELECT "aiPrompt", "aiProvider", "apiKey", "autoSync", "carPartsPass", "carPartsUser", "conradPass", "conradUser", "googleApiKey", "googleModel", "id", "lastSync", "lexwarePass", "lexwareUser", "openaiKey", "openaiModel", "syncEnabled", "theme" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
