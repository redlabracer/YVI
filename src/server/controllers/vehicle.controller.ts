import { Request, Response } from 'express'
import prisma from '../db'

export const createVehicle = async (req: Request, res: Response) => {
  try {
    const {
      licensePlate,
      vin,
      make,
      model,
      hsn,
      tsn,
      firstRegistration,
      mileage,
      fuelType,
      transmission,
      notes,
      customerId
    } = req.body

    if (!customerId) {
        return res.status(400).json({ error: 'Customer ID is required' })
    }

    const vehicle = await prisma.vehicle.create({
      data: {
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
        notes,
        customerId: parseInt(customerId)
      }
    })
    res.json(vehicle)
  } catch (error) {
    console.error('Error creating vehicle:', error)
    res.status(500).json({ error: 'Failed to create vehicle' })
  }
}

export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const data = req.body
    
    // Remove fields that shouldn't be updated directly or are handled specially
    delete data.id
    delete data.customerId
    delete data.createdAt
    delete data.appointments
    delete data.history

    // Handle date conversion if present
    if (data.firstRegistration) {
        data.firstRegistration = new Date(data.firstRegistration)
    }
    if (data.mileage) {
        data.mileage = parseInt(data.mileage)
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(id) },
      data: data
    })
    res.json(vehicle)
  } catch (error) {
    console.error('Error updating vehicle:', error)
    res.status(500).json({ error: 'Failed to update vehicle' })
  }
}

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.vehicle.delete({
      where: { id: parseInt(id) }
    })
    res.json({ message: 'Vehicle deleted successfully' })
  } catch (error) {
    console.error('Error deleting vehicle:', error)
    res.status(500).json({ error: 'Failed to delete vehicle' })
  }
}
