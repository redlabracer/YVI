import { Request, Response } from 'express'
import prisma from '../db'

export const getServiceTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await prisma.serviceTemplate.findMany({
      orderBy: { title: 'asc' }
    })
    res.json(templates)
  } catch (error) {
    console.error('Error fetching service templates:', error)
    res.status(500).json({ error: 'Failed to fetch service templates' })
  }
}

export const createServiceTemplate = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Missing required fields: title, description' })
    }

    const template = await prisma.serviceTemplate.create({
      data: { title, description }
    })
    res.status(201).json(template)
  } catch (error) {
    console.error('Error creating service template:', error)
    res.status(500).json({ error: 'Failed to create service template' })
  }
}

export const updateServiceTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, description } = req.body

    const template = await prisma.serviceTemplate.update({
      where: { id: parseInt(id, 10) },
      data: { title, description }
    })
    res.json(template)
  } catch (error) {
    console.error('Error updating service template:', error)
    res.status(500).json({ error: 'Failed to update service template' })
  }
}

export const deleteServiceTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.serviceTemplate.delete({
      where: { id: parseInt(id, 10) }
    })
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting service template:', error)
    res.status(500).json({ error: 'Failed to delete service template' })
  }
}
