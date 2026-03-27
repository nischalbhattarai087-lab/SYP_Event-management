const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const organizerRequestController = require('../controllers/organizerRequestController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware, roleMiddleware('admin'));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.get('/events', adminController.getAllEvents);
router.delete('/events/:id', adminController.deleteEvent);
router.put('/events/:id/approve', adminController.approveEvent);
router.put('/events/:id/reject', adminController.rejectEvent);
router.put('/events/:id/rate', adminController.rateEventOrganizer);

// Organizer approval workflow
router.get('/organizer-requests', organizerRequestController.getPendingRequests);
router.put('/organizer-requests/:id/approve', organizerRequestController.approveRequest);
router.put('/organizer-requests/:id/decline', organizerRequestController.declineRequest);

module.exports = router;
