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
    
    // Get customer first to check for lexwareId
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })
    
    if (!customer) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' })
    }
    
    const hadLexwareId = !!customer.lexwareId
    
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
    
    // Return success with Lexware warning if applicable
    res.json({ 
      success: true,
      lexwareWarning: hadLexwareId ? 'Der Kunde war mit Lexware verknüpft. Bitte löschen Sie den Kontakt auch manuell in Lexware Office, da die API keine Löschung unterstützt.' : null
    })
  } catch (error) {
    console.error('Error deleting customer:', error)
    res.status(500).json({ error: 'Fehler beim Löschen' })
  }
}

// Check for duplicate customers
export const checkDuplicate = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, email, licensePlate } = req.body
    
    // SQLite doesn't support case-insensitive mode, so we use a different approach
    // First check by license plate (most reliable)
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
    
    // For name matching in SQLite, we need to fetch and filter manually
    // because SQLite doesn't support case-insensitive equals
    const matches: any[] = []
    
    // Check by name (case-insensitive manual comparison)
    if (firstName && lastName) {
      const allCustomers = await prisma.customer.findMany({
        include: { vehicles: true }
      })
      
      const nameMatches = allCustomers.filter(c => 
        c.firstName?.toLowerCase() === firstName.toLowerCase() &&
        c.lastName?.toLowerCase() === lastName.toLowerCase()
      )
      
      for (const d of nameMatches) {
        matches.push({
          id: d.id,
          firstName: d.firstName,
          lastName: d.lastName,
          phone: d.phone,
          address: d.address,
          vehicles: d.vehicles?.map(v => v.licensePlate).filter(Boolean),
          matchReason: 'Name'
        })
      }
    }
    
    // Check by phone
    if (phone && phone.length > 5) {
      const cleanPhone = phone.replace(/\s/g, '')
      const phoneMatches = await prisma.customer.findMany({
        where: { phone: { contains: cleanPhone } },
        include: { vehicles: true }
      })
      
      for (const d of phoneMatches) {
        if (!matches.find(m => m.id === d.id)) {
          matches.push({
            id: d.id,
            firstName: d.firstName,
            lastName: d.lastName,
            phone: d.phone,
            address: d.address,
            vehicles: d.vehicles?.map(v => v.licensePlate).filter(Boolean),
            matchReason: 'Telefon'
          })
        }
      }
    }
    
    // Check by email
    if (email && email.length > 3) {
      const allCustomers = await prisma.customer.findMany({
        where: { email: { not: null } },
        include: { vehicles: true }
      })
      
      const emailMatches = allCustomers.filter(c => 
        c.email?.toLowerCase() === email.toLowerCase()
      )
      
      for (const d of emailMatches) {
        if (!matches.find(m => m.id === d.id)) {
          matches.push({
            id: d.id,
            firstName: d.firstName,
            lastName: d.lastName,
            phone: d.phone,
            address: d.address,
            vehicles: d.vehicles?.map(v => v.licensePlate).filter(Boolean),
            matchReason: 'E-Mail'
          })
        }
      }
    }
    
    if (matches.length > 0) {
      return res.json({ isDuplicate: true, matches: matches.slice(0, 5) })
    }
    
    res.json({ isDuplicate: false, matches: [] })
  } catch (error) {
    console.error('Error checking duplicate:', error)
    res.status(500).json({ error: 'Fehler bei der Duplikatsprüfung' })
  }
}

// Merge two customers - keeps targetCustomerId, moves all data from sourceCustomerId, then deletes source
export const mergeCustomers = async (req: Request, res: Response) => {
  try {
    const { targetCustomerId, sourceCustomerId, keepTargetData } = req.body
    
    if (!targetCustomerId || !sourceCustomerId) {
      return res.status(400).json({ error: 'Beide Kunden-IDs sind erforderlich' })
    }
    
    if (targetCustomerId === sourceCustomerId) {
      return res.status(400).json({ error: 'Kann einen Kunden nicht mit sich selbst zusammenführen' })
    }
    
    // Get both customers
    const [target, source] = await Promise.all([
      prisma.customer.findUnique({ 
        where: { id: parseInt(targetCustomerId) },
        include: { vehicles: true, documents: true, history: true, appointments: true }
      }),
      prisma.customer.findUnique({ 
        where: { id: parseInt(sourceCustomerId) },
        include: { vehicles: true, documents: true, history: true, appointments: true }
      })
    ])
    
    if (!target || !source) {
      return res.status(404).json({ error: 'Einer oder beide Kunden wurden nicht gefunden' })
    }
    
    // Move all vehicles from source to target
    await prisma.vehicle.updateMany({
      where: { customerId: source.id },
      data: { customerId: target.id }
    })
    
    // Move all documents from source to target
    await prisma.document.updateMany({
      where: { customerId: source.id },
      data: { customerId: target.id }
    })
    
    // Move all service records (history) from source to target
    await prisma.serviceRecord.updateMany({
      where: { customerId: source.id },
      data: { customerId: target.id }
    })
    
    // Move all appointments from source to target
    await prisma.appointment.updateMany({
      where: { customerId: source.id },
      data: { customerId: target.id }
    })
    
    // Handle Lexware ID transfer: If source has lexwareId and target doesn't, transfer it
    let lexwareUpdateResult = null
    let lexwareWarning = null
    
    if (source.lexwareId && !target.lexwareId) {
      // Transfer lexwareId from source to target
      await prisma.customer.update({
        where: { id: target.id },
        data: { lexwareId: source.lexwareId }
      })
      
      // Update the contact in Lexware with the new customer data
      try {
        const settings = await prisma.settings.findFirst()
        if (settings?.apiKey) {
          const lexwareResponse = await fetch(`https://api.lexware.io/v1/contacts/${source.lexwareId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${settings.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              version: 0, // Will be fetched and updated
              roles: { customer: {} },
              person: {
                firstName: target.firstName,
                lastName: target.lastName
              },
              ...(target.email ? { emailAddresses: { business: [target.email] } } : {}),
              ...(target.phone ? { phoneNumbers: { business: [target.phone] } } : {})
            })
          })
          
          if (lexwareResponse.ok) {
            lexwareUpdateResult = 'Lexware Kontakt wurde aktualisiert'
          } else {
            lexwareWarning = 'Lexware Kontakt konnte nicht automatisch aktualisiert werden. Bitte manuell in Lexware prüfen.'
          }
        }
      } catch (lexwareError) {
        console.error('Error updating Lexware contact:', lexwareError)
        lexwareWarning = 'Lexware Kontakt konnte nicht automatisch aktualisiert werden. Bitte manuell in Lexware prüfen.'
      }
    } else if (source.lexwareId && target.lexwareId) {
      // Both have lexwareIds - warn user that manual merge in Lexware is needed
      lexwareWarning = 'Beide Kunden waren mit unterschiedlichen Lexware-Kontakten verknüpft. Bitte führen Sie die Kontakte auch manuell in Lexware Office zusammen.'
    } else if (source.lexwareId) {
      lexwareWarning = 'Der gelöschte Kunde war mit Lexware verknüpft. Bitte löschen Sie den Kontakt manuell in Lexware Office.'
    }
    
    // Update target customer with source data if target data is empty and keepTargetData is true
    if (keepTargetData) {
      const updateData: any = {}
      if (!target.phone && source.phone) updateData.phone = source.phone
      if (!target.email && source.email) updateData.email = source.email
      if (!target.address && source.address) updateData.address = source.address
      
      if (Object.keys(updateData).length > 0) {
        await prisma.customer.update({
          where: { id: target.id },
          data: updateData
        })
      }
    }
    
    // Delete the source customer (now empty)
    await prisma.customer.delete({
      where: { id: source.id }
    })
    
    // Return the merged customer
    const mergedCustomer = await prisma.customer.findUnique({
      where: { id: target.id },
      include: { vehicles: true, documents: true, history: true, appointments: true }
    })
    
    res.json({ 
      success: true, 
      message: `Kunde "${source.firstName} ${source.lastName}" wurde mit "${target.firstName} ${target.lastName}" zusammengeführt`,
      customer: mergedCustomer,
      lexwareUpdateResult,
      lexwareWarning
    })
  } catch (error) {
    console.error('Error merging customers:', error)
    res.status(500).json({ error: 'Fehler beim Zusammenführen der Kunden' })
  }
}

// Transfer a vehicle from one customer to another
export const transferVehicle = async (req: Request, res: Response) => {
  try {
    const { vehicleId, targetCustomerId } = req.body
    
    if (!vehicleId || !targetCustomerId) {
      return res.status(400).json({ error: 'Fahrzeug-ID und Ziel-Kunden-ID sind erforderlich' })
    }
    
    // Check if target customer exists
    const targetCustomer = await prisma.customer.findUnique({
      where: { id: parseInt(targetCustomerId) }
    })
    
    if (!targetCustomer) {
      return res.status(404).json({ error: 'Ziel-Kunde nicht gefunden' })
    }
    
    // Get the vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: parseInt(vehicleId) },
      include: { customer: true }
    })
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Fahrzeug nicht gefunden' })
    }
    
    if (vehicle.customerId === parseInt(targetCustomerId)) {
      return res.status(400).json({ error: 'Fahrzeug gehört bereits diesem Kunden' })
    }
    
    // Transfer the vehicle
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: parseInt(vehicleId) },
      data: { customerId: parseInt(targetCustomerId) },
      include: { customer: true }
    })
    
    res.json({ 
      success: true, 
      message: `Fahrzeug ${vehicle.licensePlate || vehicle.make + ' ' + vehicle.model} wurde zu "${targetCustomer.firstName} ${targetCustomer.lastName}" übertragen`,
      vehicle: updatedVehicle
    })
  } catch (error) {
    console.error('Error transferring vehicle:', error)
    res.status(500).json({ error: 'Fehler beim Übertragen des Fahrzeugs' })
  }
}

// Search customers (for transfer/merge dialogs)
export const searchCustomers = async (req: Request, res: Response) => {
  try {
    const { query, excludeId } = req.query
    
    if (!query || String(query).length < 1) {
      return res.json([])
    }
    
    const searchTerm = String(query).trim()
    const excludeCustomerId = excludeId ? parseInt(String(excludeId)) : undefined
    
    // Check if search term is a number (customer ID search)
    const isNumericSearch = /^\d+$/.test(searchTerm)
    
    let customers
    
    if (isNumericSearch) {
      // Search by customer ID
      const customerId = parseInt(searchTerm)
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { vehicles: true }
      })
      
      if (customer && (!excludeCustomerId || customer.id !== excludeCustomerId)) {
        customers = [customer]
      } else {
        customers = []
      }
    } else {
      // Split search into words for multi-word search (e.g. "Max Mustermann")
      const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0)
      
      // Normal text search - all terms must match
      customers = await prisma.customer.findMany({
        where: {
          AND: [
            excludeCustomerId ? { id: { not: excludeCustomerId } } : {},
            ...searchTerms.map(term => ({
              OR: [
                { firstName: { contains: term } },
                { lastName: { contains: term } },
                { phone: { contains: term } },
                { email: { contains: term } },
                { vehicles: { some: { licensePlate: { contains: term.toUpperCase() } } } }
              ]
            }))
          ]
        },
        take: 10,
        include: { vehicles: true }
      })
    }
    
    res.json(customers)
  } catch (error) {
    console.error('Error searching customers:', error)
    res.status(500).json({ error: 'Fehler bei der Kundensuche' })
  }
}
