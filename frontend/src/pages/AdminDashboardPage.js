import React, { useState, useEffect } from 'react';
import { Users, Calendar, Ticket, DollarSign, Trash2, Shield, CheckCircle2, XCircle, UserCheck, Clock } from 'lucide-react';
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
  const [orgRequests, setOrgRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAll = async () => {
    try {
      const [sRes, uRes, eRes, rRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/events'),
        api.get('/admin/organizer-requests'),
      ]);
      setStats(sRes.data.data);
      setUsers(uRes.data.data || []);
      setEvents(eRes.data.data || []);
      setOrgRequests(rRes.data.data || []);
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

  const roleOptions = (currentRole) => {
    if (currentRole === 'admin') return [{ value: 'admin', label: 'Admin' }];
    return [
      { value: 'user', label: 'User' },
      { value: 'organizer', label: 'Organizer' },
    ];
  };

  const handleApproveOrgRequest = async (id, name) => {
    try {
      await api.put(`/admin/organizer-requests/${id}/approve`);
      toast.success(`✅ ${name} promoted to Organizer!`);
      setOrgRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve.'); }
  };

  const handleDeclineOrgRequest = async (id, name) => {
    try {
      await api.put(`/admin/organizer-requests/${id}/decline`);
      toast.info(`Request from ${name} declined.`);
      setOrgRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to decline.'); }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this event permanently?')) return;
    try {
      await api.delete(`/admin/events/${id}`);
      toast.success('Event deleted.');
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch { toast.error('Failed to delete event.'); }
  };

  const handleApproveEvent = async (id) => {
    try {
      await api.put(`/admin/events/${id}/approve`, {});
      toast.success('Event approved.');
      setEvents(prev => prev.map(e => e.id === id ? { ...e, is_active: true, review_status: 'approved' } : e));
    } catch {
      toast.error('Failed to approve event.');
    }
  };

  const handleRejectEvent = async (id) => {
    try {
      await api.put(`/admin/events/${id}/reject`, {});
      toast.success('Event rejected.');
      setEvents(prev => prev.map(e => e.id === id ? { ...e, is_active: false, review_status: 'rejected' } : e));
    } catch {
      toast.error('Failed to update event status.');
    }
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
          {['overview', 'users', 'events', 'requests'].map(tab => (
            <button key={tab} className={`dashboard__tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'requests' ? (
                <>
                  <UserCheck size={14} style={{ display: 'inline', marginRight: 5 }} />
                  Organizer Requests
                  {orgRequests.length > 0 && (
                    <span style={{ marginLeft: 6, background: 'var(--red)', color: '#fff', borderRadius: '99px', fontSize: '0.7rem', padding: '1px 7px', fontWeight: 700 }}>
                      {orgRequests.length}
                    </span>
                  )}
                </>
              ) : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                            {roleOptions(u.role).map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
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
                <thead><tr><th>Title</th><th>Organizer</th><th>Date</th><th>Category</th><th>Status</th><th>Seats</th><th>Price</th><th></th></tr></thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id}>
                      <td><strong>{e.title}</strong></td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{e.organizer_name || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(e.event_date)}</td>
                      <td><span className="badge badge-teal">{e.category}</span></td>
                      <td>
                        <span className={`badge ${e.is_active ? 'badge-teal' : 'badge-red'}`}>
                          {e.review_status === 'rejected' ? 'Rejected' : e.is_active ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{e.available_seats}/{e.total_seats}</td>
                      <td style={{ fontWeight: 700 }}>{formatPrice(e.price)}</td>
                      <td>
                        {e.is_active ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleRejectEvent(e.id)} title="Mark as pending">
                            <XCircle size={14} />
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--teal)' }} onClick={() => handleApproveEvent(e.id)} title="Approve event">
                            <CheckCircle2 size={14} />
                          </button>
                        )}
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
        {/* Organizer Requests Tab */}
        {activeTab === 'requests' && (
          <div className="admin-users fade-in">
            <h3 style={{ marginBottom: '1rem' }}>Pending Organizer Requests ({orgRequests.length})</h3>
            {orgRequests.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-400)' }}>
                <UserCheck size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <p>No pending organizer requests. All caught up!</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Requested</th><th>Actions</th></tr></thead>
                  <tbody>
                    {orgRequests.map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.user_name}</strong></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{r.user_email}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                          {formatDate(r.created_at)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--teal-dark)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(135,182,188,0.4)', borderRadius: '6px', padding: '0.3rem 0.75rem' }}
                              onClick={() => handleApproveOrgRequest(r.id, r.user_name)}
                              title="Approve organizer request"
                            >
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--red)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(220,60,60,0.25)', borderRadius: '6px', padding: '0.3rem 0.75rem' }}
                              onClick={() => handleDeclineOrgRequest(r.id, r.user_name)}
                              title="Decline organizer request"
                            >
                              <XCircle size={14} /> Decline
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
