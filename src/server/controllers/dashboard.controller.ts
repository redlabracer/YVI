import { Request, Response } from 'express';
import prisma from '../db';

export const globalSearch = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const query = String(q || '').trim();

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const results: any[] = [];

    // Split search query into words for multi-word search
    const searchTerms = query.split(/\s+/).filter(term => term.length > 0);

    // Search Customers
    const customers = await prisma.customer.findMany({
      where: {
        AND: searchTerms.map(term => ({
          OR: [
            { firstName: { contains: term } },
            { lastName: { contains: term } },
            { phone: { contains: term } }
          ]
        }))
      },
      take: 5
    });

    customers.forEach(c => {
      results.push({
        type: 'customer',
        id: c.id,
        primaryText: `${c.firstName} ${c.lastName}`,
        secondaryText: c.address || 'Keine Adresse',
        customerId: c.id
      });
    });

    // Search Vehicles
    const vehicles = await prisma.vehicle.findMany({
      where: {
        AND: searchTerms.map(term => ({
          OR: [
            { licensePlate: { contains: term } },
            { vin: { contains: term } },
            { make: { contains: term } },
            { model: { contains: term } }
          ]
        }))
      },
      include: { customer: true },
      take: 5
    });

    vehicles.forEach(v => {
      results.push({
        type: 'vehicle',
        id: v.id,
        primaryText: `${v.make} ${v.model} (${v.licensePlate})`,
        secondaryText: `Kunde: ${v.customer.firstName} ${v.customer.lastName}`,
        customerId: v.customerId
      });
    });

    res.json(results);
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count customers
    const customerCount = await prisma.customer.count();

    // Count vehicles
    const vehicleCount = await prisma.vehicle.count();

    // Count today's appointments
    const todayAppointments = await prisma.appointment.count({
      where: {
        start: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Count open appointments
    const openAppointments = await prisma.appointment.count({
      where: {
        status: 'open'
      }
    });

    // Count pending todos
    const pendingTodos = await prisma.todo.count({
      where: {
        isDone: false
      }
    });

    // Get recent appointments
    const recentAppointments = await prisma.appointment.findMany({
      where: {
        start: {
          gte: today
        }
      },
      include: {
        customer: true,
        vehicle: true
      },
      orderBy: {
        start: 'asc'
      },
      take: 5
    });

    res.json({
      customerCount,
      vehicleCount,
      todayAppointments,
      openAppointments,
      pendingTodos,
      recentAppointments
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
