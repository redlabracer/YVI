import { Request, Response } from 'express'
import prisma from '../db'

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.settings.findFirst()

    if (!settings) {
      settings = await prisma.settings.create({
        data: {}
      })
    }

    res.json(settings)
  } catch (error) {
    console.error('Error getting settings:', error)
    res.status(500).json({ error: 'Fehler beim Laden der Einstellungen' })
  }
}

export const saveSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body
    
    // Remove id from data if present to avoid unique constraint errors or invalid updates
    const { id, ...updateData } = data

    const existing = await prisma.settings.findFirst()

    if (existing) {
      const updated = await prisma.settings.update({
        where: { id: existing.id },
        data: updateData
      })
      res.json(updated)
    } else {
      const created = await prisma.settings.create({
        data: updateData
      })
      res.json(created)
    }
  } catch (error) {
    console.error('Error saving settings:', error)
    res.status(500).json({ error: 'Fehler beim Speichern der Einstellungen' })
  }
}
