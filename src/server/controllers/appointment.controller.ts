import { Request, Response } from 'express';
import prisma from '../db';

export const getAppointments = async (_req: Request, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        customer: true,
        vehicle: true
      },
      orderBy: {
        start: 'asc'
      }
    });
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export const getAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        customer: true,
        vehicle: true
      }
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
};

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { title, start, end, customerId, vehicleId, description, status } = req.body;

    if (!title || !start || !end) {
      return res.status(400).json({ error: 'Missing required fields: title, start, end' });
    }

    const parsedCustomerId = customerId ? parseInt(String(customerId), 10) : null;
    const parsedVehicleId = vehicleId ? parseInt(String(vehicleId), 10) : null;

    const appointment = await prisma.appointment.create({
      data: {
        title,
        start: new Date(start),
        end: new Date(end),
        description: description || '',
        status: status || 'open',
        customerId: parsedCustomerId,
        vehicleId: parsedVehicleId
      },
      include: {
        customer: true,
        vehicle: true
      }
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, start, end, customerId, vehicleId, description, status } = req.body;

    const parsedCustomerId = customerId ? parseInt(String(customerId), 10) : null;
    const parsedVehicleId = vehicleId ? parseInt(String(vehicleId), 10) : null;

    const appointment = await prisma.appointment.update({
      where: { id: parseInt(id, 10) },
      data: {
        title,
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined,
        description,
        status,
        customerId: parsedCustomerId,
        vehicleId: parsedVehicleId
      },
      include: {
        customer: true,
        vehicle: true
      }
    });

    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.appointment.delete({
      where: { id: parseInt(id, 10) }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
};

export const completeAppointment = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const { mileage, description, date } = req.body;

    // Update appointment status
    const appointment = await prisma.appointment.update({
      where: { id: parseInt(appointmentId, 10) },
      data: {
        status: 'done'
      },
      include: {
        customer: true,
        vehicle: true
      }
    });

    // Create service record if we have customer info
    if (appointment.customerId) {
      await prisma.serviceRecord.create({
        data: {
          date: date ? new Date(date) : new Date(),
          description: description || appointment.title || 'Service durchgeführt',
          mileage: mileage ? parseInt(String(mileage), 10) : null,
          customerId: appointment.customerId,
          vehicleId: appointment.vehicleId || undefined
        }
      });

      // Update vehicle mileage if provided
      if (mileage && appointment.vehicleId) {
        await prisma.vehicle.update({
          where: { id: appointment.vehicleId },
          data: { mileage: parseInt(String(mileage), 10) }
        });
      }
    }

    res.json({ success: true, appointment });
  } catch (error) {
    console.error('Error completing appointment:', error);
    res.status(500).json({ error: 'Failed to complete appointment' });
  }
};
