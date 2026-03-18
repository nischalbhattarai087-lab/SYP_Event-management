import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Bell, Calendar, MapPin, Clock, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { formatDate, formatTime, formatPrice, getImageUrl } from '../utils/formatters';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tickets');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [tRes, nRes] = await Promise.all([
          api.get('/tickets/my'),
          api.get('/notifications'),
        ]);
        setTickets(tRes.data.data || []);
        setNotifications(nRes.data.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="dashboard" style={{ paddingTop: 68 }}>
      <div className="page-header">
        <div className="container">
          <h1>My Dashboard</h1>
          <p>Manage your tickets and notifications</p>
        </div>
      </div>

      <div className="container dashboard__content">
        {/* Profile Card */}
        <div className="dashboard__profile card">
          <div className="card-body">
            <div className="dashboard__avatar">{initials}</div>
            <div>
              <h3 className="dashboard__name">{user?.name}</h3>
              <p className="dashboard__email">{user?.email}</p>
              <span className={`badge ${user?.role === 'admin' ? 'badge-red' : user?.role === 'organizer' ? 'badge-teal' : 'badge-sage'}`}>
                {user?.role}
              </span>
            </div>
            <div className="dashboard__stats">
              <div className="dashboard__stat">
                <strong>{tickets.length}</strong>
                <span>Tickets</span>
              </div>
              <div className="dashboard__stat">
                <strong>{notifications.filter(n => !n.is_read).length}</strong>
                <span>Unread</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard__tabs">
          <button className={`dashboard__tab${activeTab === 'tickets' ? ' active' : ''}`} onClick={() => setActiveTab('tickets')}>
            <Ticket size={16} /> My Tickets <span className="dashboard__tab-count">{tickets.length}</span>
          </button>
          <button className={`dashboard__tab${activeTab === 'notifications' ? ' active' : ''}`} onClick={() => setActiveTab('notifications')}>
            <Bell size={16} /> Notifications
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="dashboard__tab-badge">{notifications.filter(n => !n.is_read).length}</span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ padding: '3rem' }}><Loader /></div>
        ) : activeTab === 'tickets' ? (
          <div className="dashboard__tickets">
            {tickets.length === 0 ? (
              <div className="dashboard__empty">
                <Ticket size={52} />
                <h3>No tickets yet</h3>
                <p>Browse events and purchase your first ticket!</p>
                <Link to="/events" className="btn btn-primary">Browse Events</Link>
              </div>
            ) : (
              tickets.map(ticket => (
                <div key={ticket.id} className="ticket-card card">
                  <div className="ticket-card__img">
                    {getImageUrl(ticket.poster_url) ? (
                      <img src={getImageUrl(ticket.poster_url)} alt={ticket.event_title} />
                    ) : (
                      <div className="ticket-card__img-placeholder"><Calendar size={28} /></div>
                    )}
                  </div>
                  <div className="ticket-card__info">
                    <h3>{ticket.event_title}</h3>
                    <div className="ticket-card__meta">
                      <span><Calendar size={13} />{formatDate(ticket.event_date)}</span>
                      <span><Clock size={13} />{formatTime(ticket.event_time)}</span>
                      <span><MapPin size={13} />{ticket.location}</span>
                    </div>
                  </div>
                  <div className="ticket-card__right">
                    <div className="ticket-card__qr">
                      <span>🎫</span>
                      <code>{ticket.qr_code}</code>
                    </div>
                    <div>
                      <div className="ticket-card__qty">{ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''}</div>
                      <div className="ticket-card__price">{formatPrice(ticket.total_price)}</div>
                    </div>
                    <span className={`badge ${ticket.status === 'confirmed' ? 'badge-sage' : 'badge-red'}`}>
                      <CheckCircle size={11} /> {ticket.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="dashboard__notifications">
            {notifications.length > 0 && (
              <div className="dashboard__notif-header">
                <p>{notifications.filter(n => !n.is_read).length} unread</p>
                <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all as read</button>
              </div>
            )}
            {notifications.length === 0 ? (
              <div className="dashboard__empty">
                <Bell size={52} />
                <h3>No notifications</h3>
                <p>You'll be notified when you purchase tickets or events are updated.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`dashboard__notif-item${n.is_read ? '' : ' unread'}`}>
                  <div className="dashboard__notif-icon">
                    {n.type === 'ticket_confirmed' ? '🎟️' : n.type === 'event_reminder' ? '⏰' : '📢'}
                  </div>
                  <div className="dashboard__notif-content">
                    <p>{n.message}</p>
                    {n.event_title && <span>Event: {n.event_title}</span>}
                    <time>{formatDate(n.created_at)}</time>
                  </div>
                  {!n.is_read && <div className="dashboard__notif-dot" />}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
