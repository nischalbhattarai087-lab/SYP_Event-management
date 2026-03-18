import React, { useState, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import api from '../api/axios';
import EventCard from '../components/EventCard';
import FilterBar from '../components/FilterBar';
import Loader from '../components/Loader';
import './EventsPage.css';

const DEFAULT_FILTERS = { search: '', category: '', date_from: '', date_to: '', location: '' };

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchEvents = useCallback(async (currentFilters, currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 9 });
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.category) params.append('category', currentFilters.category);
      if (currentFilters.date_from) params.append('date_from', currentFilters.date_from);
      if (currentFilters.date_to) params.append('date_to', currentFilters.date_to);
      if (currentFilters.location) params.append('location', currentFilters.location);

      const res = await api.get(`/events?${params}`);
      setEvents(res.data.data || []);
      setPagination(res.data.pagination || { total: 0, page: 1, pages: 1 });
    } catch (err) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchEvents(filters, page);
    }, filters.search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [filters, page, fetchEvents]);

  // Read category from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat) setFilters(f => ({ ...f, category: cat }));
  }, []);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  return (
    <div className="events-page">
      <div className="page-header">
        <div className="container">
          <h1>Browse Events</h1>
          <p>Discover and book tickets to the best events happening near you</p>
        </div>
      </div>

      <div className="container events-page__content">
        <aside className="events-page__sidebar">
          <FilterBar filters={filters} onChange={handleFilterChange} onReset={handleReset} />
        </aside>

        <main className="events-page__main">
          <div className="events-page__top-bar">
            <p className="events-page__count">
              {loading ? 'Loading...' : `${pagination.total} event${pagination.total !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {loading ? (
            <div className="flex-center" style={{ padding: '5rem' }}><Loader size={48} /></div>
          ) : events.length === 0 ? (
            <div className="events-page__empty">
              <Calendar size={60} />
              <h3>No events found</h3>
              <p>Try adjusting your filters or search term</p>
              <button className="btn btn-outline" onClick={handleReset}>Reset Filters</button>
            </div>
          ) : (
            <>
              <div className="events-page__grid">
                {events.map(e => <EventCard key={e.id} event={e} />)}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="events-page__pagination">
                  <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                  <div className="events-page__page-nums">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                      <button key={p} className={`events-page__page-num${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                    ))}
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default EventsPage;
