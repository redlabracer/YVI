import { Request, Response } from 'express';
import prisma from '../db';

export const getTodos = async (req: Request, res: Response) => {
  try {
    const todos = await prisma.todo.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
};

export const createTodo = async (req: Request, res: Response) => {
  try {
    const { title, customerId } = req.body;
    const todo = await prisma.todo.create({
      data: {
        title,
        customerId: customerId ? Number(customerId) : null
      },
      include: { customer: true }
    });
    res.json(todo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create todo' });
  }
};

export const updateTodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isDone, title, customerId } = req.body;
    const todo = await prisma.todo.update({
      where: { id: Number(id) },
      data: {
        isDone,
        title,
        customerId: customerId ? Number(customerId) : undefined
      },
      include: { customer: true }
    });
    res.json(todo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
};

export const deleteTodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.todo.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
};
