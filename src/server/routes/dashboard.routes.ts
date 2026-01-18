import { Router } from 'express';
import { globalSearch, getDashboardStats } from '../controllers/dashboard.controller';

const router = Router();

router.get('/search', globalSearch);
router.get('/stats', getDashboardStats);

export default router;
