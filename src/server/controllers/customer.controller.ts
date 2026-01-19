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
        filePaths // File paths (already uploaded to /uploads folder)
    } = data

    // Construct Prisma Data
    const createData: any = {
        firstName,
        lastName,
        address,
        phone,
        email
    }

    // Only add vehicle if at least some vehicle data is present
    if (licensePlate || vin || make || model) {
        // Parse firstRegistration safely
        let parsedDate: Date | null = null
        if (firstRegistration) {
            const date = new Date(firstRegistration)
            if (!isNaN(date.getTime())) {
                parsedDate = date
            }
        }
        
        createData.vehicles = {
            create: {
                licensePlate,
                vin,
                make,
                model,
                hsn,
                tsn,
                firstRegistration: parsedDate,
                mileage: mileage ? parseInt(mileage) : null,
                fuelType,
                transmission
            }
        }
    }

    // Add documents if file paths are provided
    if (filePaths && Array.isArray(filePaths) && filePaths.length > 0) {
        createData.documents = {
            create: filePaths.map((filePath: string) => {
                // Extract filename from path
                const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'document'
                return {
                    name: fileName,
                    path: filePath,
                    type: 'registration' // Fahrzeugschein
                }
            })
        }
    }

    const customer = await prisma.customer.create({
      data: createData,
      include: {
        vehicles: true,
        documents: true
      }
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
    const customerId = parseInt(id)
    
    // Delete related records first to avoid foreign key constraint errors
    // Delete documents
    await prisma.document.deleteMany({
      where: { customerId }
    })
    
    // Delete service records (history)
    await prisma.serviceRecord.deleteMany({
      where: { customerId }
    })
    
    // Delete appointments
    await prisma.appointment.deleteMany({
      where: { customerId }
    })
    
    // Delete vehicles
    await prisma.vehicle.deleteMany({
      where: { customerId }
    })
    
    // Now delete the customer
    await prisma.customer.delete({
      where: { id: customerId }
    })
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    res.status(500).json({ error: 'Fehler beim Löschen' })
  }
}

// Check for duplicate customers
export const checkDuplicate = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, email, licensePlate } = req.body
    
    const conditions: any[] = []
    
    // Check by name (both first and last name must match)
    if (firstName && lastName) {
      conditions.push({
        AND: [
          { firstName: { equals: firstName, mode: 'insensitive' } },
          { lastName: { equals: lastName, mode: 'insensitive' } }
        ]
      })
    }
    
    // Check by phone
    if (phone && phone.length > 5) {
      conditions.push({ phone: { contains: phone.replace(/\s/g, '') } })
    }
    
    // Check by email (use lowercase comparison for SQLite)
    if (email && email.length > 3) {
      conditions.push({ email: { equals: email.toLowerCase() } })
    }
    
    // Check by license plate (via vehicle) - use uppercase for comparison
    if (licensePlate && licensePlate.length > 2) {
      const normalizedPlate = licensePlate.replace(/\s/g, '').toUpperCase()
      const vehicleMatch = await prisma.vehicle.findFirst({
        where: { 
          licensePlate: normalizedPlate
        },
        include: { customer: true }
      })
      
      if (vehicleMatch && vehicleMatch.customer) {
        return res.json({
          isDuplicate: true,
          matches: [{
            id: vehicleMatch.customer.id,
            firstName: vehicleMatch.customer.firstName,
            lastName: vehicleMatch.customer.lastName,
            phone: vehicleMatch.customer.phone,
            matchReason: 'Kennzeichen'
          }]
        })
      }
    }
    
    if (conditions.length === 0) {
      return res.json({ isDuplicate: false, matches: [] })
    }
    
    const duplicates = await prisma.customer.findMany({
      where: { OR: conditions },
      take: 5,
      include: { vehicles: true }
    })
    
    if (duplicates.length > 0) {
      const matches = duplicates.map(d => {
        let matchReason = ''
        if (firstName && lastName && 
            d.firstName?.toLowerCase() === firstName.toLowerCase() && 
            d.lastName?.toLowerCase() === lastName.toLowerCase()) {
          matchReason = 'Name'
        } else if (phone && d.phone?.includes(phone.replace(/\s/g, ''))) {
          matchReason = 'Telefon'
        } else if (email && d.email?.toLowerCase() === email.toLowerCase()) {
          matchReason = 'E-Mail'
        }
        
        return {
          id: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
          phone: d.phone,
          address: d.address,
          vehicles: d.vehicles?.map(v => v.licensePlate).filter(Boolean),
          matchReason
        }
      })
      
      return res.json({ isDuplicate: true, matches })
    }
    
    res.json({ isDuplicate: false, matches: [] })
  } catch (error) {
    console.error('Error checking duplicate:', error)
    res.status(500).json({ error: 'Fehler bei der Duplikatsprüfung' })
  }
}
