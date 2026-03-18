const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', notifController.getMyNotifications);
router.put('/mark-all-read', notifController.markAllRead);
router.put('/:id/read', notifController.markAsRead);

module.exports = router;
