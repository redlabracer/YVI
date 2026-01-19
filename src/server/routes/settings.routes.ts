import express from 'express'
import { getSettings, saveSettings, syncLexware } from '../controllers/settings.controller'

const router = express.Router()

router.get('/', getSettings)
router.post('/', saveSettings)
router.post('/sync-lexware', syncLexware)

export default router
