const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);

// Organizer & Admin
router.post('/', authMiddleware, roleMiddleware('organizer', 'admin'), upload.single('poster'), eventController.createEvent);
router.put('/:id', authMiddleware, roleMiddleware('organizer', 'admin'), upload.single('poster'), eventController.updateEvent);
router.delete('/:id', authMiddleware, roleMiddleware('organizer', 'admin'), eventController.deleteEvent);

// My events (organizer)
router.get('/organizer/my', authMiddleware, roleMiddleware('organizer', 'admin'), eventController.getMyEvents);

module.exports = router;
