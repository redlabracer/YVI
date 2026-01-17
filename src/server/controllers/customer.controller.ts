import { Request, Response } from 'express'
import prisma from '../db'

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: { vehicles: true }
    })
    res.json(customers)
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Kunden' })
  }
}

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const data = req.body
    const customer = await prisma.customer.create({
      data: {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    res.json(customer)
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Erstellen des Kunden' })
  }
}
