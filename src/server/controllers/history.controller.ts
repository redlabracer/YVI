import { Request, Response } from 'express'
import prisma from '../db'

export const createHistoryEntry = async (req: Request, res: Response) => {
  try {
    const {
      date,
      description,
      mileage,
      cost,
      customerId,
      vehicleId
    } = req.body

    if (!customerId || !description) {
        return res.status(400).json({ error: 'Customer ID and description are required' })
    }

    const historyEntry = await prisma.serviceRecord.create({
      data: {
        date: date ? new Date(date) : new Date(),
        description,
        mileage: mileage ? parseInt(mileage) : null,
        cost: cost ? parseFloat(cost) : null,
        customerId: parseInt(customerId),
        vehicleId: vehicleId ? parseInt(vehicleId) : null
      }
    })
    res.json(historyEntry)
  } catch (error) {
    console.error('Error creating history entry:', error)
    res.status(500).json({ error: 'Failed to create history entry' })
  }
}

export const updateHistoryEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = req.body

    delete data.id
    delete data.customerId
    delete data.createdAt
    delete data.updatedAt
    delete data.filePaths  // Not a DB field, handled separately
    delete data.documents  // Relation, not directly updatable
    
    if (data.date) {
        data.date = new Date(data.date)
    }
    if (data.mileage) {
        data.mileage = parseInt(data.mileage)
    }
    if (data.cost) {
        data.cost = parseFloat(data.cost)
    }
    if (data.vehicleId) {
        data.vehicleId = parseInt(data.vehicleId)
    }

    const historyEntry = await prisma.serviceRecord.update({
      where: { id: parseInt(id) },
      data: data
    })
    res.json(historyEntry)
  } catch (error) {
    console.error('Error updating history entry:', error)
    res.status(500).json({ error: 'Failed to update history entry' })
  }
}

export const deleteHistoryEntry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.serviceRecord.delete({
      where: { id: parseInt(id) }
    })
    res.json({ message: 'History entry deleted successfully' })
  } catch (error) {
    console.error('Error deleting history entry:', error)
    res.status(500).json({ error: 'Failed to delete history entry' })
  }
}
