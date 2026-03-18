import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Bell, Calendar, LogOut, User, LayoutDashboard, Settings } from 'lucide-react';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isOrganizer, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <Calendar size={22} />
          <span>Event<strong>Hub</strong></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="navbar__links hide-mobile">
          <NavLink to="/" end className={({isActive}) => isActive ? 'navbar__link active' : 'navbar__link'}>Home</NavLink>
          <NavLink to="/events" className={({isActive}) => isActive ? 'navbar__link active' : 'navbar__link'}>Browse Events</NavLink>
          {isOrganizer() && (
            <NavLink to="/organizer" className={({isActive}) => isActive ? 'navbar__link active' : 'navbar__link'}>My Events</NavLink>
          )}
          {isAdmin() && (
            <NavLink to="/admin" className={({isActive}) => isActive ? 'navbar__link active' : 'navbar__link'}>Admin</NavLink>
          )}
        </nav>

        {/* Right Side */}
        <div className="navbar__actions">
          {user ? (
            <>
              <NotificationBell />
              <div className="navbar__avatar-wrap" ref={dropdownRef}>
                <button className="navbar__avatar" onClick={() => setDropdownOpen(!dropdownOpen)} aria-label="User menu">
                  {initials}
                </button>
                {dropdownOpen && (
                  <div className="navbar__dropdown fade-in">
                    <div className="navbar__dropdown-header">
                      <span className="navbar__dropdown-name">{user.name}</span>
                      <span className="navbar__dropdown-role">{user.role}</span>
                    </div>
                    <div className="divider" style={{margin:'0.5rem 0'}} />
                    <Link to="/dashboard" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <LayoutDashboard size={15} /> Dashboard
                    </Link>
                    {isOrganizer() && (
                      <Link to="/organizer" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <Settings size={15} /> My Events
                      </Link>
                    )}
                    {isAdmin() && (
                      <Link to="/admin" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <User size={15} /> Admin Panel
                      </Link>
                    )}
                    <div className="divider" style={{margin:'0.5rem 0'}} />
                    <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost hide-mobile">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
          {/* Mobile menu toggle */}
          <button className="navbar__burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="navbar__mobile slide-in">
          <NavLink to="/" end className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/events" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>Browse Events</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
              {isOrganizer() && <NavLink to="/organizer" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>My Events</NavLink>}
              {isAdmin() && <NavLink to="/admin" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>Admin</NavLink>}
              <button className="navbar__mobile-link navbar__mobile-logout" onClick={() => { handleLogout(); setMenuOpen(false); }}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/register" className="navbar__mobile-link navbar__mobile-cta" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
