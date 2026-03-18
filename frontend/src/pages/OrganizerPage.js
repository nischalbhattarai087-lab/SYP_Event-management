import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, Eye, Calendar, Users, Tag } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import { formatDate, formatPrice, getImageUrl } from '../utils/formatters';
import './OrganizerPage.css';

const EMPTY_FORM = {
  title: '', description: '', category: 'General', event_date: '', event_time: '',
  location: '', address: '', total_seats: 100, price: 0,
};

const OrganizerPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [poster, setPoster] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events/organizer/my');
      setEvents(res.data.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePosterChange = (e) => {
    const file = e.target.files[0];
    setPoster(file);
    if (file) setPosterPreview(URL.createObjectURL(file));
  };

  const handleEdit = (event) => {
    setEditingId(event.id);
    setForm({
      title: event.title, description: event.description || '',
      category: event.category, event_date: event.event_date?.split('T')[0] || '',
      event_time: event.event_time || '', location: event.location,
      address: event.address || '', total_seats: event.total_seats, price: event.price,
    });
    setPosterPreview(getImageUrl(event.poster_url));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted.');
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch { toast.error('Failed to delete event.'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (poster) formData.append('poster', poster);

      if (editingId) {
        await api.put(`/events/${editingId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Event updated!');
      } else {
        await api.post('/events', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Event created! 🎉');
      }
      setForm(EMPTY_FORM); setPoster(null); setPosterPreview(null);
      setEditingId(null); setShowForm(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save event.');
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM); setPoster(null); setPosterPreview(null);
    setEditingId(null); setShowForm(false);
  };

  return (
    <div className="organizer-page" style={{ paddingTop: 68 }}>
      <div className="page-header">
        <div className="container flex-between">
          <div>
            <h1>My Events</h1>
            <p>Create and manage your events</p>
          </div>
          <button className="btn btn-accent btn-lg" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} /> New Event
          </button>
        </div>
      </div>

      <div className="container organizer-page__content">
        {/* Event Form */}
        {showForm && (
          <div className="organizer-form card fade-in">
            <div className="card-body">
              <h2>{editingId ? 'Edit Event' : 'Create New Event'}</h2>
              <form className="organizer-form__grid" onSubmit={handleSubmit}>
                {/* Poster Upload */}
                <div className="organizer-form__poster-col">
                  <label className="organizer-form__poster-area" htmlFor="poster-upload">
                    {posterPreview ? (
                      <img src={posterPreview} alt="Preview" />
                    ) : (
                      <div className="organizer-form__poster-placeholder">
                        <Plus size={28} />
                        <p>Click to upload poster</p>
                        <span>PNG, JPG up to 5MB</span>
                      </div>
                    )}
                    <input id="poster-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePosterChange} />
                  </label>
                </div>

                {/* Fields */}
                <div className="organizer-form__fields">
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Event Title *</label>
                    <input type="text" name="title" className="form-control" value={form.title} onChange={handleChange} required />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Description</label>
                    <textarea name="description" className="form-control" rows={3} value={form.description} onChange={handleChange} style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select name="category" className="form-control form-select" value={form.category} onChange={handleChange}>
                      {['Concert','Conference','Workshop','Festival','Sports','Theater','Exhibition','General'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" name="event_date" className="form-control" value={form.event_date} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time *</label>
                    <input type="time" name="event_time" className="form-control" value={form.event_time} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location *</label>
                    <input type="text" name="location" className="form-control" placeholder="e.g. Pokhara, Nepal" value={form.location} onChange={handleChange} required />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Full Address</label>
                    <input type="text" name="address" className="form-control" placeholder="Full address for map" value={form.address} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Seats *</label>
                    <input type="number" name="total_seats" className="form-control" min={1} value={form.total_seats} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ticket Price (Rs.) *</label>
                    <input type="number" name="price" className="form-control" min={0} step="0.01" value={form.price} onChange={handleChange} required />
                  </div>
                  <div className="organizer-form__actions" style={{ gridColumn: '1/-1' }}>
                    <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving...' : editingId ? 'Update Event' : 'Create Event'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Events Table */}
        {loading ? <Loader fullPage /> : events.length === 0 ? (
          <div className="organizer-empty">
            <Calendar size={60} />
            <h3>No events yet</h3>
            <p>Create your first event to get started!</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Create Event</button>
          </div>
        ) : (
          <div className="organizer-events">
            <h3 style={{ marginBottom: '1rem' }}>Your Events ({events.length})</h3>
            {events.map(event => {
              const img = getImageUrl(event.poster_url);
              return (
                <div key={event.id} className="organizer-event-row card">
                  <div className="organizer-event-row__img">
                    {img ? <img src={img} alt={event.title} /> : <div className="organizer-event-row__img-ph"><Calendar size={20} /></div>}
                  </div>
                  <div className="organizer-event-row__info">
                    <h4>{event.title}</h4>
                    <div className="organizer-event-row__meta">
                      <span><Calendar size={12} />{formatDate(event.event_date)}</span>
                      <span><Users size={12} />{event.available_seats}/{event.total_seats} seats</span>
                      <span><Tag size={12} />{formatPrice(event.price)}</span>
                    </div>
                  </div>
                  <div className="organizer-event-row__actions">
                    <Link to={`/events/${event.id}`} className="btn btn-ghost btn-sm"><Eye size={14} /></Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(event)}><Edit2 size={14} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleDelete(event.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerPage;
