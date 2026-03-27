const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/events/:eventId/reviews', authMiddleware, reviewController.getEventReviews);
router.get('/events/:eventId/me', authMiddleware, reviewController.getMyReviewForEvent);
router.post('/events/:eventId', authMiddleware, reviewController.upsertMyReview);

module.exports = router;

