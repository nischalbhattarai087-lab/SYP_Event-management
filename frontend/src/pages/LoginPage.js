import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { LogIn, Eye, EyeOff, Calendar } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate(res.data.user.role === 'admin' ? '/admin' : res.data.user.role === 'organizer' ? '/organizer' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__brand">
          <Calendar size={28} />
          <span>Event<strong>Hub</strong></span>
        </div>
        <h2>Welcome back!</h2>
        <p>Sign in to manage your events, tickets and notifications.</p>
        <div className="auth-page__bubbles">
          <div className="auth-bubble auth-bubble--1" />
          <div className="auth-bubble auth-bubble--2" />
          <div className="auth-bubble auth-bubble--3" />
        </div>
      </div>

      <div className="auth-page__right">
        <div className="auth-card">
          <h2 className="auth-card__title">Sign In</h2>
          <p className="auth-card__sub">Don't have an account? <Link to="/register">Register here</Link></p>

          <form className="auth-card__form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" name="email" className="form-control" placeholder="you@email.com" value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="auth-card__input-wrap">
                <input type={showPwd ? 'text' : 'password'} name="password" className="form-control" placeholder="Enter your password" value={form.password} onChange={handleChange} required />
                <button type="button" className="auth-card__toggle-pwd" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg auth-card__submit" disabled={loading}>
              {loading ? 'Signing in...' : <><LogIn size={17} /> Sign In</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
