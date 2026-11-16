import express from 'express'
import { createInvoiceDraft, getSettings, saveSettings, syncLexware } from '../controllers/settings.controller'

const router = express.Router()

router.get('/', getSettings)
router.post('/', saveSettings)
router.post('/sync-lexware', syncLexware)
router.post('/lexware-invoice-draft', createInvoiceDraft)

export default router
