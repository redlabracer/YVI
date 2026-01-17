import { Request, Response } from 'express'
import prisma from '../db'

export const getServiceTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await prisma.serviceTemplate.findMany({
      orderBy: { title: 'asc' }
    })
    res.json(templates)
  } catch (error) {
    console.error('Error fetching service templates:', error)
    res.status(500).json({ error: 'Failed to fetch service templates' })
  }
}
