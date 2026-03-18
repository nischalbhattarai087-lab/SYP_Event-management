import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatDate } from '../utils/formatters';
import './NotificationBell.css';

const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
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
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
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

  const typeIcon = (type) => {
    const icons = { ticket_confirmed: '🎟️', event_reminder: '⏰', event_update: '📢', info: 'ℹ️' };
    return icons[type] || 'ℹ️';
  };

  return (
    <div className="notif-bell" ref={ref}>
      <button className="notif-bell__btn" onClick={() => setOpen(!open)} aria-label="Notifications">
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

          <div className="notif-bell__list">
            {notifications.length === 0 ? (
              <div className="notif-bell__empty">
                <Bell size={28} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 8).map(n => (
                <div
                  key={n.id}
                  className={`notif-bell__item${n.is_read ? '' : ' notif-bell__item--unread'}`}
                  onClick={() => !n.is_read && handleMarkOne(n.id)}
                >
                  <span className="notif-bell__icon">{typeIcon(n.type)}</span>
                  <div className="notif-bell__content">
                    <p>{n.message}</p>
                    <span>{formatDate(n.created_at)}</span>
                  </div>
                  {!n.is_read && <span className="notif-bell__dot" />}
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
