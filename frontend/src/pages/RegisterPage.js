import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { UserPlus, Eye, EyeOff, Calendar } from 'lucide-react';
import api from '../api/axios';
import './AuthPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      toast.error('Fill in all fields.');
      return;
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/register', form);
      if (res.data.pendingOrganizerRequest) {
        toast.success("Account created! ⏳ Your organizer request is pending admin approval. You'll be notified once reviewed.", { autoClose: 6000 });
      } else {
        toast.success(res.data.message || `Account created for ${form.name}. Please sign in.`);
      }
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__left auth-page__left--register">
        <div className="auth-page__brand">
          <Calendar size={28} />
          <span>Event<strong>Hub</strong></span>
        </div>
        <h2>Join us today!</h2>
        <p>Create your account and start discovering amazing events near you.</p>
        <div className="auth-page__features">
          <div className="auth-feature"><span>1.</span><p>Instant ticket purchase</p></div>
          <div className="auth-feature"><span>2.</span><p>Event reminders</p></div>
          <div className="auth-feature"><span>3.</span><p>Location-based discovery</p></div>
        </div>
        <div className="auth-page__bubbles">
          <div className="auth-bubble auth-bubble--1" />
          <div className="auth-bubble auth-bubble--2" />
          <div className="auth-bubble auth-bubble--3" />
        </div>
      </div>

      <div className="auth-page__right">
        <div className="auth-card">
          <h2 className="auth-card__title">Create Account</h2>
          <p className="auth-card__sub">Already registered? <Link to="/login">Sign in</Link></p>

          <form className="auth-card__form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Seron Rai"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="you@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Password <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(min. 6 characters)</span>
              </label>
              <div className="auth-card__input-wrap">
                <input
                  type={showPwd ? 'text' : 'password'}
                  name="password"
                  className="form-control"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="auth-card__toggle-pwd"
                  onClick={() => setShowPwd(!showPwd)}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Account Type</label>
              <select name="role" className="form-control form-select" value={form.role} onChange={handleChange}>
                <option value="user">Attendee - Browse and buy tickets</option>
                <option value="organizer">Organizer - Create and manage events</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-lg auth-card__submit" disabled={loading}>
              {loading ? 'Creating...' : <><UserPlus size={17} /> Create Account</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
