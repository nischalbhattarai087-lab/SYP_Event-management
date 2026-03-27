const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const organizerRequestController = require('../controllers/organizerRequestController');

// GET /api/organizer-requests/my-status  — for any logged-in user
router.get('/my-status', authMiddleware, organizerRequestController.getMyStatus);

module.exports = router;
