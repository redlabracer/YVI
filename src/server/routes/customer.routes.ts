import { Router } from 'express'
import { 
  getCustomers, 
  createCustomer, 
  getCustomer, 
  updateCustomer, 
  deleteCustomer,
  checkDuplicate
} from '../controllers/customer.controller'

const router = Router()

router.get('/', getCustomers)
router.post('/', createCustomer)
router.post('/check-duplicate', checkDuplicate)
router.get('/:id', getCustomer)
router.put('/:id', updateCustomer)
router.delete('/:id', deleteCustomer)

export default router
