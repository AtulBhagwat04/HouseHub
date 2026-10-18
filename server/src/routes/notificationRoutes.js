import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import {
  clearNotifications,
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
  removeNotification,
} from '../controllers/notificationController.js';

const router = Router();

router.use(protect);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllRead);
router.delete('/clear', clearNotifications);
router.patch('/:notificationId/read', idParam('notificationId'), validate, markRead);
router.delete('/:notificationId', idParam('notificationId'), validate, removeNotification);

export default router;
