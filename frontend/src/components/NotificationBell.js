import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, XCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatDate } from '../utils/formatters';
import { toast } from 'react-toastify';
import './NotificationBell.css';

const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [reviewModal, setReviewModal] = useState(null); // { requestId, requesterName, requesterEmail, notifId }
  const [actionLoading, setActionLoading] = useState(false);
  const ref = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
      setUnread(res.data.unreadCount || 0);
    } catch {}
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    const handleRefresh = () => fetchNotifications();
    const handleFocus = () => fetchNotifications();
    window.addEventListener('eventhub:notifications:refresh', handleRefresh);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('eventhub:notifications:refresh', handleRefresh);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setReviewModal(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkAll = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const handleMarkOne = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const openReviewModal = (n) => {
    const meta = n.metadata || {};
    setReviewModal({
      requestId: meta.requestId,
      requesterName: meta.requesterName,
      requesterEmail: meta.requesterEmail,
      notifId: n.id,
    });
  };

  const handleApprove = async () => {
    if (!reviewModal?.requestId) return;
    setActionLoading(true);
    try {
      await api.put(`/admin/organizer-requests/${reviewModal.requestId}/approve`);
      toast.success(`✅ ${reviewModal.requesterName} has been promoted to Organizer!`);
      setReviewModal(null);
      fetchNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!reviewModal?.requestId) return;
    setActionLoading(true);
    try {
      await api.put(`/admin/organizer-requests/${reviewModal.requestId}/decline`);
      toast.info(`Request from ${reviewModal.requesterName} has been declined.`);
      setReviewModal(null);
      fetchNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline request.');
    } finally {
      setActionLoading(false);
    }
  };

  const typeIcon = (type) => {
    const icons = {
      ticket_confirmed: '🎟️',
      event_reminder: '⏰',
      event_update: '📢',
      info: 'ℹ️',
      organizer_request: '🧑‍💼',
    };
    return icons[type] || 'ℹ️';
  };

  return (
    <div className="notif-bell" ref={ref}>
      <button
        className="notif-bell__btn"
        onClick={() => {
          fetchNotifications();
          setOpen(!open);
          setReviewModal(null);
        }}
        aria-label="Notifications"
      >
        <Bell size={19} />
        {unread > 0 && <span className="notif-bell__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-bell__panel fade-in">
          <div className="notif-bell__header">
            <h4>Notifications</h4>
            {unread > 0 && (
              <button className="notif-bell__mark-all" onClick={handleMarkAll}>Mark all read</button>
            )}
          </div>

          {/* Mini Approve/Decline Modal */}
          {reviewModal && (
            <div className="notif-bell__review-modal">
              <div className="notif-bell__review-header">
                <User size={16} />
                <span>Organizer Request</span>
              </div>
              <div className="notif-bell__review-info">
                <strong>{reviewModal.requesterName}</strong>
                <span>{reviewModal.requesterEmail}</span>
              </div>
              <p className="notif-bell__review-desc">
                This user wants to become an organizer and create events on EventHub.
              </p>
              <div className="notif-bell__review-actions">
                <button
                  className="notif-bell__review-btn notif-bell__review-btn--approve"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  <CheckCircle2 size={14} />
                  {actionLoading ? 'Processing…' : 'Approve'}
                </button>
                <button
                  className="notif-bell__review-btn notif-bell__review-btn--decline"
                  onClick={handleDecline}
                  disabled={actionLoading}
                >
                  <XCircle size={14} />
                  Decline
                </button>
                <button
                  className="notif-bell__review-btn notif-bell__review-btn--cancel"
                  onClick={() => setReviewModal(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="notif-bell__list">
            {notifications.length === 0 ? (
              <div className="notif-bell__empty">
                <Bell size={28} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(n => (
                <div
                  key={n.id}
                  className={`notif-bell__item${n.is_read ? '' : ' notif-bell__item--unread'}${n.type === 'organizer_request' ? ' notif-bell__item--request' : ''}`}
                  onClick={() => {
                    if (n.type === 'organizer_request' && n.metadata) {
                      openReviewModal(n);
                    } else if (!n.is_read) {
                      handleMarkOne(n.id);
                    }
                  }}
                >
                  <span className="notif-bell__icon">{typeIcon(n.type)}</span>
                  <div className="notif-bell__content">
                    <p>{n.message}</p>
                    <span>{formatDate(n.created_at)}</span>
                  </div>
                  {n.type === 'organizer_request' && n.metadata && (
                    <span className="notif-bell__review-tag">Review</span>
                  )}
                  {!n.is_read && n.type !== 'organizer_request' && <span className="notif-bell__dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
