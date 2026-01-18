import { Request, Response } from 'express';
import prisma from '../db';

export const getShopClosures = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    
    let whereClause = {};
    if (start && end) {
      whereClause = {
        start: {
          gte: new Date(start as string)
        },
        end: {
          lte: new Date(end as string)
        }
      };
    }

    const closures = await prisma.shopClosure.findMany({
      where: whereClause,
      orderBy: {
        start: 'asc'
      }
    });
    res.json(closures);
  } catch (error) {
    console.error('Error fetching shop closures:', error);
    res.status(500).json({ error: 'Failed to fetch shop closures' });
  }
};

export const createShopClosure = async (req: Request, res: Response) => {
  try {
    const { start, end, description } = req.body;

    if (!start || !end || !description) {
      return res.status(400).json({ error: 'Missing required fields: start, end, description' });
    }

    const closure = await prisma.shopClosure.create({
      data: {
        start: new Date(start),
        end: new Date(end),
        description
      }
    });

    res.status(201).json(closure);
  } catch (error) {
    console.error('Error creating shop closure:', error);
    res.status(500).json({ error: 'Failed to create shop closure' });
  }
};

export const deleteShopClosure = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.shopClosure.delete({
      where: { id: parseInt(id, 10) }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting shop closure:', error);
    res.status(500).json({ error: 'Failed to delete shop closure' });
  }
};
