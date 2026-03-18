import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Mail, MapPin, Github, Instagram, Twitter } from 'lucide-react';
import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="container footer__inner">
      <div className="footer__brand">
        <Link to="/" className="footer__logo">
          <Calendar size={20} />
          <span>Event<strong>Hub</strong></span>
        </Link>
        <p className="footer__tagline">Discover, attend, and create unforgettable events — all in one place.</p>
        <div className="footer__socials">
          <a href="#" aria-label="Twitter"><Twitter size={17} /></a>
          <a href="#" aria-label="Instagram"><Instagram size={17} /></a>
          <a href="#" aria-label="Github"><Github size={17} /></a>
        </div>
      </div>

      <div className="footer__links-group">
        <h4>Explore</h4>
        <Link to="/events">Browse Events</Link>
        <Link to="/events?category=Concert">Concerts</Link>
        <Link to="/events?category=Workshop">Workshops</Link>
        <Link to="/events?category=Festival">Festivals</Link>
      </div>

      <div className="footer__links-group">
        <h4>Account</h4>
        <Link to="/login">Sign In</Link>
        <Link to="/register">Register</Link>
        <Link to="/dashboard">My Tickets</Link>
        <Link to="/organizer">Create Event</Link>
      </div>

      <div className="footer__links-group">
        <h4>Contact</h4>
        <a href="mailto:hello@eventhub.np" className="footer__contact-item">
          <Mail size={14} /> hello@eventhub.np
        </a>
        <span className="footer__contact-item">
          <MapPin size={14} /> Kathmandu, Nepal
        </span>
      </div>
    </div>
    <div className="footer__bottom">
      <div className="container">
        <p>© {new Date().getFullYear()} EventHub. Built with ♥ for events.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
