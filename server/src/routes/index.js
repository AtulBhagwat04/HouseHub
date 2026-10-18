import { Router } from 'express';
import authRoutes from './authRoutes.js';
import houseRoutes from './houseRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/houses', houseRoutes);
router.use('/notifications', notificationRoutes);

export default router;
