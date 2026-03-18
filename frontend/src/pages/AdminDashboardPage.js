import React, { useState, useEffect } from 'react';
import { Users, Calendar, Ticket, DollarSign, Trash2, Shield, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import Loader from '../components/Loader';
import { formatDate, formatPrice, formatCurrency } from '../utils/formatters';
import './AdminDashboardPage.css';

const StatCard = ({ icon, label, value, color }) => (
  <div className="admin-stat-card card">
    <div className="card-body">
      <div className="admin-stat-card__icon" style={{ background: `${color}22`, color }}>{icon}</div>
      <div>
        <div className="admin-stat-card__value">{value}</div>
        <div className="admin-stat-card__label">{label}</div>
      </div>
    </div>
  </div>
);

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAll = async () => {
    try {
      const [sRes, uRes, eRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/events'),
      ]);
      setStats(sRes.data.data);
      setUsers(uRes.data.data || []);
      setEvents(eRes.data.data || []);
    } catch { toast.error('Failed to load admin data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success('User role updated.');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch { toast.error('Failed to update role.'); }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this event permanently?')) return;
    try {
      await api.delete(`/admin/events/${id}`);
      toast.success('Event deleted.');
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch { toast.error('Failed to delete event.'); }
  };

  if (loading) return <div style={{ paddingTop: 68 }}><Loader fullPage /></div>;

  return (
    <div className="admin-page" style={{ paddingTop: 68 }}>
      <div className="page-header">
        <div className="container flex-between">
          <div>
            <h1><Shield size={24} style={{ display: 'inline', marginRight: 8 }} />Admin Dashboard</h1>
            <p>Manage users, events, and monitor platform activity</p>
          </div>
        </div>
      </div>

      <div className="container admin-page__content">
        {/* Stats */}
        {stats && (
          <div className="admin-stats-grid">
            <StatCard icon={<Users size={22} />} label="Total Users" value={stats.totalUsers} color="var(--teal)" />
            <StatCard icon={<Calendar size={22} />} label="Total Events" value={stats.totalEvents} color="var(--sage-dark)" />
            <StatCard icon={<Ticket size={22} />} label="Tickets Sold" value={stats.totalTickets} color="var(--red)" />
            <StatCard icon={<DollarSign size={22} />} label="Total Revenue" value={formatCurrency(stats.totalRevenue)} color="#8a7e00" />
          </div>
        )}

        {/* Tabs */}
        <div className="dashboard__tabs">
          {['overview', 'users', 'events'].map(tab => (
            <button key={tab} className={`dashboard__tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="admin-overview fade-in">
            <h3>Recent Events</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Event</th><th>Date</th><th>Location</th><th>Available / Total</th></tr></thead>
                <tbody>
                  {stats.recentEvents.map(e => (
                    <tr key={e.id}>
                      <td><strong>{e.title}</strong></td>
                      <td>{formatDate(e.event_date)}</td>
                      <td>{e.location}</td>
                      <td>
                        <div className="admin-seats-bar">
                          <div className="admin-seats-bar__track">
                            <div className="admin-seats-bar__fill" style={{ width: `${((e.total_seats - e.available_seats) / e.total_seats) * 100}%` }} />
                          </div>
                          <span>{e.available_seats}/{e.total_seats}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="admin-users fade-in">
            <h3 style={{ marginBottom: '1rem' }}>All Users ({users.length})</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Action</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.name}</strong></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-red' : u.role === 'organizer' ? 'badge-teal' : 'badge-sage'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatDate(u.created_at)}</td>
                      <td>
                        <div className="admin-role-select">
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            className="form-control form-select"
                            style={{ padding: '0.3rem 2rem 0.3rem 0.7rem', fontSize: '0.82rem', borderRadius: '6px' }}
                          >
                            <option value="user">User</option>
                            <option value="organizer">Organizer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="admin-events fade-in">
            <h3 style={{ marginBottom: '1rem' }}>All Events ({events.length})</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Title</th><th>Organizer</th><th>Date</th><th>Category</th><th>Seats</th><th>Price</th><th></th></tr></thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id}>
                      <td><strong>{e.title}</strong></td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{e.organizer_name || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(e.event_date)}</td>
                      <td><span className="badge badge-teal">{e.category}</span></td>
                      <td style={{ fontSize: '0.85rem' }}>{e.available_seats}/{e.total_seats}</td>
                      <td style={{ fontWeight: 700 }}>{formatPrice(e.price)}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDeleteEvent(e.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
