import { Router } from 'express'
import { getServiceTemplates } from '../controllers/template.controller'

const router = Router()

router.get('/', getServiceTemplates)

export default router
