import { Router } from 'express'
import { getAllTireSpots, updateTireSpot } from '../controllers/tire.controller'

const router = Router()

router.get('/', getAllTireSpots)
router.put('/:id', updateTireSpot)

export default router
