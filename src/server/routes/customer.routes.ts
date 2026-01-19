import { Router } from 'express'
import { 
  getCustomers, 
  createCustomer, 
  getCustomer, 
  updateCustomer, 
  deleteCustomer,
  checkDuplicate,
  mergeCustomers,
  transferVehicle,
  searchCustomers
} from '../controllers/customer.controller'

const router = Router()

router.get('/', getCustomers)
router.get('/search', searchCustomers)
router.post('/', createCustomer)
router.post('/check-duplicate', checkDuplicate)
router.post('/merge', mergeCustomers)
router.post('/transfer-vehicle', transferVehicle)
router.get('/:id', getCustomer)
router.put('/:id', updateCustomer)
router.delete('/:id', deleteCustomer)

export default router
