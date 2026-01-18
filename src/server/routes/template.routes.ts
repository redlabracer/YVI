import { Router } from 'express'
import { 
  getServiceTemplates, 
  createServiceTemplate, 
  updateServiceTemplate, 
  deleteServiceTemplate 
} from '../controllers/template.controller'

const router = Router()

router.get('/', getServiceTemplates)
router.post('/', createServiceTemplate)
router.put('/:id', updateServiceTemplate)
router.delete('/:id', deleteServiceTemplate)

export default router
