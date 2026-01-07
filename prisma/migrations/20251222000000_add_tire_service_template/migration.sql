INSERT INTO "ServiceTemplate" ("title", "description", "createdAt", "updatedAt")
SELECT 'Reifenwechsel', 'Reifenwechsel inkl. Wuchten und Einlagerung', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ServiceTemplate" WHERE "title" = 'Reifenwechsel');
