import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Bell, Calendar, MapPin, Clock, CheckCircle, Clock3, Download, XCircle, MessageCircle } from 'lucide-react';
import { toast } from 'react-toastify';
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
  const [orgRequestStatus, setOrgRequestStatus] = useState('none');
  const [cancelModal, setCancelModal] = useState(null); // ticket object or null
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [tRes, nRes] = await Promise.all([
        api.get('/tickets/my'),
        api.get('/notifications'),
      ]);
      setTickets(tRes.data.data || []);
      setNotifications(nRes.data.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    if (user && user.role === 'user') {
      api.get('/organizer-requests/my-status')
        .then(res => setOrgRequestStatus(res.data.data?.status || 'none'))
        .catch(() => {});
    }
  }, [user, fetchAll]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleDownload = async (ticket) => {
    setDownloadingId(ticket.id);
    try {
      const res = await api.get(`/tickets/${ticket.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${ticket.id}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Ticket downloaded!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to download ticket.');
    } finally {
      setDownloadingId(null);
    }
  };

  const openCancelModal = (ticket) => {
    setCancelModal(ticket);
    setCancelReason('');
  };

  const closeCancelModal = () => {
    setCancelModal(null);
    setCancelReason('');
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      await api.put(`/tickets/${cancelModal.id}/cancel`, { reason: cancelReason });
      toast.success('Ticket cancelled successfully.');
      closeCancelModal();
      fetchAll(); // refresh ticket list
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel ticket.');
    } finally {
      setCancelling(false);
    }
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

      {/* Organizer pending approval banner */}
      {orgRequestStatus === 'pending' && (
        <div style={{
          background: 'linear-gradient(90deg, #fffbeb, #fef3c7)',
          borderBottom: '1px solid #fcd34d',
          padding: '0.75rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          fontSize: '0.88rem', color: '#92400e', fontWeight: 500,
        }}>
          <Clock3 size={16} style={{ flexShrink: 0 }} />
          <span>⏳ Your <strong>organizer request</strong> is under review. You'll be notified once the admin approves or declines it.</span>
        </div>
      )}
      {orgRequestStatus === 'declined' && (
        <div style={{
          background: 'linear-gradient(90deg, #fff5f5, #fee2e2)',
          borderBottom: '1px solid #fca5a5',
          padding: '0.75rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          fontSize: '0.88rem', color: '#991b1b', fontWeight: 500,
        }}>
          <span>❌ Your organizer request was <strong>declined</strong> by admin.</span>
        </div>
      )}

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
          <Link to="/chat" className="dashboard__tab" style={{ textDecoration: 'none' }}>
            <MessageCircle size={16} /> Chat
          </Link>
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
                    <div className="ticket-card__actions">
                      {ticket.status === 'confirmed' && (
                        <>
                          <button
                            className="btn btn-sm ticket-action-btn ticket-action-btn--download"
                            onClick={() => handleDownload(ticket)}
                            disabled={downloadingId === ticket.id}
                            title="Download Ticket"
                          >
                            <Download size={13} />
                            {downloadingId === ticket.id ? 'Downloading…' : 'Download'}
                          </button>
                          <button
                            className="btn btn-sm ticket-action-btn ticket-action-btn--cancel"
                            onClick={() => openCancelModal(ticket)}
                            title="Cancel Ticket"
                          >
                            <XCircle size={13} />
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
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
                    {n.type === 'ticket_confirmed' ? '🎟️' : n.type === 'event_reminder' ? '⏰' : n.type === 'organizer_request' ? '🧑‍💼' : '📢'}
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

      {/* Cancel Confirmation Modal */}
      {cancelModal && (
        <div className="modal-overlay" onClick={closeCancelModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Cancel Ticket</h3>
            <p>Are you sure you want to cancel your ticket for <strong>{cancelModal.event_title}</strong>?</p>
            <textarea
              className="cancel-reason-input"
              rows={3}
              placeholder="Reason for cancellation (optional)…"
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={closeCancelModal} disabled={cancelling}>Keep Ticket</button>
              <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
