const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/contacts', chatController.getAllowedContacts);
router.get('/conversations', chatController.getMyConversations);
router.post('/conversations', chatController.getOrCreateConversation);
router.get('/conversations/:id/messages', chatController.getConversationMessages);
router.post('/conversations/:id/messages', chatController.sendMessage);

module.exports = router;
