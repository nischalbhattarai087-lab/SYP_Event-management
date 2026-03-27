const db = require('../config/db');
const OrganizerRequestModel = require('../models/organizerRequestModel');
const UserModel = require('../models/userModel');
const NotificationModel = require('../models/notificationModel');

// GET /api/admin/organizer-requests  (admin only)
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await OrganizerRequestModel.findPending();
    res.json({ success: true, data: requests });
  } catch (err) {
    console.error('getPendingRequests error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/admin/organizer-requests/:id/approve  (admin only)
exports.approveRequest = async (req, res) => {
  try {
    const request = await OrganizerRequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request is no longer pending.' });
    }

    // Promote user to organizer
    await UserModel.updateRole(request.user_id, 'organizer');

    // Resolve the request
    await OrganizerRequestModel.resolve(req.params.id, 'approved', req.user.id);

    // Notify the requester
    await NotificationModel.create({
      user_id: request.user_id,
      message: '🎉 Congratulations! Your organizer request has been approved. You can now create and manage events.',
      type: 'info',
    });

    // Mark the admin notification(s) for this request as read
    await db.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE metadata->>'requestId' = $1`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Organizer request approved.' });
  } catch (err) {
    console.error('approveRequest error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/admin/organizer-requests/:id/decline  (admin only)
exports.declineRequest = async (req, res) => {
  try {
    const request = await OrganizerRequestModel.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request is no longer pending.' });
    }

    // Resolve the request as declined
    await OrganizerRequestModel.resolve(req.params.id, 'declined', req.user.id);

    // Notify the requester
    await NotificationModel.create({
      user_id: request.user_id,
      message: 'Your organizer request was declined by admin. You can continue using EventHub as an attendee.',
      type: 'info',
    });

    // Mark the admin notification(s) for this request as read
    await db.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE metadata->>'requestId' = $1`,
      [req.params.id]
    );

    res.json({ success: true, message: 'Organizer request declined.' });
  } catch (err) {
    console.error('declineRequest error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/organizer-requests/my-status  (any authenticated user)
exports.getMyStatus = async (req, res) => {
  try {
    const request = await OrganizerRequestModel.findByUser(req.user.id);
    if (!request) return res.json({ success: true, data: { status: 'none' } });
    res.json({ success: true, data: { status: request.status, created_at: request.created_at } });
  } catch (err) {
    console.error('getMyStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
