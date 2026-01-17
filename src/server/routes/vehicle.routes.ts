import { Router } from 'express'
import { createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicle.controller'

const router = Router()

router.post('/', createVehicle)
router.put('/:id', updateVehicle)
router.delete('/:id', deleteVehicle)

export default router
