const ChatModel = require('../models/chatModel');

function canRolesChat(roleA, roleB) {
  if (!roleA || !roleB) return false;
  // user ↔ organizer
  if (roleA === 'user' && roleB === 'organizer') return true;
  if (roleA === 'organizer' && roleB === 'user') return true;
  // organizer ↔ admin
  if (roleA === 'organizer' && roleB === 'admin') return true;
  if (roleA === 'admin' && roleB === 'organizer') return true;
  // admin ↔ user
  if (roleA === 'admin' && roleB === 'user') return true;
  if (roleA === 'user' && roleB === 'admin') return true;
  return false;
}

async function ensureChatPermission(currentUser, targetUserId) {
  const target = await ChatModel.findUserById(targetUserId);
  if (!target) return { ok: false, code: 404, message: 'Target user not found.' };
  if (target.id === currentUser.id) return { ok: false, code: 400, message: 'Self chat is not allowed.' };
  if (!canRolesChat(currentUser.role, target.role)) {
    return { ok: false, code: 403, message: 'Chat is not allowed between these roles.' };
  }
  return { ok: true, target };
}

exports.getAllowedContacts = async (req, res) => {
  try {
    const contacts = await ChatModel.findAllowedContacts(req.user);
    res.json({ success: true, data: contacts });
  } catch (err) {
    console.error('Get chat contacts error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching contacts.' });
  }
};

exports.getOrCreateConversation = async (req, res) => {
  try {
    const { participant_id } = req.body;
    if (!participant_id) {
      return res.status(400).json({ success: false, message: 'participant_id is required.' });
    }

    const permission = await ensureChatPermission(req.user, participant_id);
    if (!permission.ok) {
      return res.status(permission.code).json({ success: false, message: permission.message });
    }

    const conversation = await ChatModel.getOrCreateConversation(req.user.id, participant_id);
    res.json({ success: true, data: conversation });
  } catch (err) {
    console.error('Get/create conversation error:', err);
    res.status(500).json({ success: false, message: 'Server error creating conversation.' });
  }
};

exports.getMyConversations = async (req, res) => {
  try {
    const conversations = await ChatModel.listMyConversations(req.user.id);
    res.json({ success: true, data: conversations });
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching conversations.' });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const conversation = await ChatModel.findConversationForUser(req.params.id, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const messages = await ChatModel.listMessages(
      conversation.id,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );
    res.json({ success: true, data: messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching messages.' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const conversation = await ChatModel.findConversationForUser(req.params.id, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const otherParticipantId =
      conversation.participant_one_id === req.user.id
        ? conversation.participant_two_id
        : conversation.participant_one_id;

    const permission = await ensureChatPermission(req.user, otherParticipantId);
    if (!permission.ok) {
      return res.status(permission.code).json({ success: false, message: permission.message });
    }

    const created = await ChatModel.createMessage(conversation.id, req.user.id, String(message).trim());
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, message: 'Server error sending message.' });
  }
};
