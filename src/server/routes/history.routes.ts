import { Router } from 'express'
import { createHistoryEntry, updateHistoryEntry, deleteHistoryEntry } from '../controllers/history.controller'

const router = Router()

router.post('/', createHistoryEntry)
router.put('/:id', updateHistoryEntry)
router.delete('/:id', deleteHistoryEntry)

export default router
