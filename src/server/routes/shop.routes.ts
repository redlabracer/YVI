import { Router } from 'express';
import {
  getShopClosures,
  createShopClosure,
  deleteShopClosure
} from '../controllers/shop.controller';

const router = Router();

router.get('/closures', getShopClosures);
router.post('/closures', createShopClosure);
router.delete('/closures/:id', deleteShopClosure);

export default router;
