const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/purchase', ticketController.purchaseTicket);
router.get('/my', ticketController.getMyTickets);
router.put('/:id/cancel', ticketController.cancelTicket);
router.get('/:id/download', ticketController.downloadTicket);
router.get('/:id', ticketController.getTicketById);

module.exports = router;
