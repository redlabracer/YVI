import { Request, Response } from 'express'
import prisma from '../db'

export const getAllTireSpots = async (req: Request, res: Response) => {
  try {
    const spots = await prisma.tireStorageSpot.findMany()
    res.json(spots)
  } catch (error) {
    console.error('Error fetching tire spots:', error)
    res.status(500).json({ error: 'Failed to fetch tire spots' })
  }
}

export const updateTireSpot = async (req: Request, res: Response) => {
  try {
    const { id, label, status } = req.body

    if (!id) {
      res.status(400).json({ error: 'ID is required' })
      return
    }

    const spot = await prisma.tireStorageSpot.upsert({
      where: { id },
      update: { label, status },
      create: { id, label, status },
    })

    res.json(spot)
  } catch (error) {
    console.error('Error updating tire spot:', error)
    res.status(500).json({ error: 'Failed to update tire spot' })
  }
}
