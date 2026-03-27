const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const OrganizerRequestModel = require('../models/organizerRequestModel');
const db = require('../config/db');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Organizer registrations are created as 'user' and put in a pending approval queue
    const wantsOrganizer = role === 'organizer';
    const userRole = 'user'; // always start as user
    const user = await UserModel.create({ name, email, password_hash, role: userRole });

    if (wantsOrganizer) {
      // Create pending organizer request
      const orgRequest = await OrganizerRequestModel.create(user.id);

      // Notify ALL admins about this request
      const admins = await db.query("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of admins.rows) {
        await db.query(
          `INSERT INTO notifications (user_id, message, type, metadata)
           VALUES ($1, $2, 'organizer_request', $3)`,
          [
            admin.id,
            `🧑‍💼 New organizer request from ${name} (${email}).`,
            JSON.stringify({ requestId: orgRequest.id, requesterId: user.id, requesterName: name, requesterEmail: email }),
          ]
        );
      }

      return res.status(201).json({
        success: true,
        message: `Account created! Your organizer request is pending admin approval. You'll be notified once reviewed.`,
        user,
        pendingOrganizerRequest: true,
      });
    }

    res.status(201).json({ success: true, message: 'Registration successful. Please sign in.', user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const { password_hash: _, ...safeUser } = user;
    const token = generateToken(safeUser);

    res.json({ success: true, message: 'Login successful.', token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
