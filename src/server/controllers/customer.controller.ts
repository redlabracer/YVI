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
    
    // Extract Check for vehicle data vs customer data
    // If the data is flat (from the React Form), we need to structure it.
    // If it's already structured, we can use it directly (but validation is good).
    
    const { 
        firstName, lastName, address, phone, email,
        licensePlate, vin, make, model, hsn, tsn, firstRegistration, mileage, fuelType, transmission,
        filePaths // Files are not handled here for now (would need upload endpoint)
    } = data

    // Construct Prisma Data
    const createData: any = {
        firstName,
        lastName,
        address,
        phone,
        email,
        createdAt: new Date(),
        updatedAt: new Date()
    }

    // Only add vehicle if at least some vehicle data is present
    if (licensePlate || vin || make || model) {
        createData.vehicles = {
            create: {
                licensePlate,
                vin,
                make,
                model,
                hsn,
                tsn,
                firstRegistration: firstRegistration ? new Date(firstRegistration) : null,
                mileage: mileage ? parseInt(mileage) : null,
                fuelType,
                transmission,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        }
    }

    const customer = await prisma.customer.create({
      data: createData
    })
    res.json(customer)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Fehler beim Erstellen des Kunden' })
  }
}

export const getCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        vehicles: true,
        documents: true,
        history: {
          include: {
            vehicle: true
          }
        },
        appointments: true
      }
    })
    if (!customer) return res.status(404).json({ error: 'Kunde nicht gefunden' })
    res.json(customer)
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden des Kunden' })
  }
}

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = req.body
    // Sicherheit: ID nicht im Body ändern lassen
    delete data.id
    
    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        // updatedAt wird automatisch von Prisma gesetzt, aber wir könnens auch erzwingen
      }
    })
    res.json(customer)
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren' })
  }
}

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.customer.delete({
      where: { id: parseInt(id) }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen' })
  }
}
