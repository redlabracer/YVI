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
