import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Ticket, Bell, MapPin, Star, ChevronRight } from 'lucide-react';
import api from '../api/axios';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import './LandingPage.css';

const CATEGORIES = [
  { name: 'Concert', emoji: '🎵', color: '#B35656' },
  { name: 'Conference', emoji: '🎤', color: '#87B6BC' },
  { name: 'Workshop', emoji: '🔧', color: '#BED4CB' },
  { name: 'Festival', emoji: '🎉', color: '#F6F09F' },
  { name: 'Sports', emoji: '⚽', color: '#87B6BC' },
  { name: 'Theater', emoji: '🎭', color: '#B35656' },
];

const FEATURES = [
  { icon: <Calendar size={28} />, title: 'Browse Events', desc: 'Discover hundreds of events near you filtered by date, location, or category.' },
  { icon: <Ticket size={28} />, title: 'Instant Tickets', desc: 'Purchase tickets in seconds with no queues. Your QR code is delivered instantly.' },
  { icon: <Bell size={28} />, title: 'Smart Notifications', desc: 'Never miss an event. Get timely reminders and updates directly in your dashboard.' },
  { icon: <MapPin size={28} />, title: 'Location Aware', desc: 'Find events happening near you with integrated map links and address details.' },
];

const LandingPage = () => {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/events?limit=3');
        setFeaturedEvents(res.data.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="landing">
      {/* ── Hero ────────────────────────── */}
      <section className="landing__hero">
        <div className="landing__hero-bg" />
        <div className="container landing__hero-content">
          <span className="landing__hero-eyebrow">✨ Your Event Discovery Platform</span>
          <h1 className="landing__hero-title">
            Find & Attend<br />
            <span className="landing__hero-highlight">Unforgettable</span> Events
          </h1>
          <p className="landing__hero-sub">
            From concerts to conferences — browse, book tickets, and stay updated,<br className="hide-mobile" />
            all in one seamless platform built for Nepal.
          </p>
          <div className="landing__hero-actions">
            <Link to="/events" className="btn btn-primary btn-lg">
              Explore Events <ArrowRight size={18} />
            </Link>
            <Link to="/register" className="btn btn-outline btn-lg">
              Create Account <ChevronRight size={18} />
            </Link>
          </div>
          <div className="landing__hero-stats">
            <div className="landing__hero-stat"><strong>500+</strong><span>Events</span></div>
            <div className="landing__hero-stat-divider" />
            <div className="landing__hero-stat"><strong>10K+</strong><span>Attendees</span></div>
            <div className="landing__hero-stat-divider" />
            <div className="landing__hero-stat"><strong>50+</strong><span>Organizers</span></div>
          </div>
        </div>
      </section>

      {/* ── Categories ──────────────────── */}
      <section className="section-sm landing__categories">
        <div className="container">
          <div className="landing__section-header">
            <h2>Browse by Category</h2>
            <Link to="/events" className="landing__see-all">See all <ChevronRight size={14} /></Link>
          </div>
          <div className="landing__cat-grid">
            {CATEGORIES.map(cat => (
              <Link key={cat.name} to={`/events?category=${cat.name}`} className="landing__cat-card">
                <div className="landing__cat-emoji" style={{ background: `${cat.color}22` }}>{cat.emoji}</div>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Events ─────────────── */}
      <section className="section landing__featured">
        <div className="container">
          <div className="landing__section-header">
            <h2>Upcoming Events</h2>
            <Link to="/events" className="landing__see-all">View all <ChevronRight size={14} /></Link>
          </div>
          {loading ? (
            <div className="flex-center" style={{ padding: '3rem' }}><Loader /></div>
          ) : featuredEvents.length > 0 ? (
            <div className="grid-auto">
              {featuredEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          ) : (
            <div className="landing__empty">
              <Calendar size={48} />
              <p>No upcoming events yet. <Link to="/register">Be the first organizer!</Link></p>
            </div>
          )}
        </div>
      </section>

      {/* ── Features ─────────────────────── */}
      <section className="section landing__features">
        <div className="container">
          <div className="landing__section-header" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: '0.5rem', marginBottom: '3rem' }}>
            <h2>Why EventHub?</h2>
            <p>Everything you need for a seamless event experience</p>
          </div>
          <div className="landing__features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="landing__feature-card">
                <div className="landing__feature-icon">{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────── */}
      <section className="landing__cta">
        <div className="container landing__cta-inner">
          <div>
            <h2>Ready to host your event?</h2>
            <p>Join hundreds of organizers sharing their passion with the world.</p>
          </div>
          <Link to="/register" className="btn btn-accent btn-lg">
            Start for Free <Star size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
