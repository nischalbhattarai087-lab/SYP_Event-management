import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Tag, ArrowLeft, Share2, ExternalLink, Ticket } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { formatDate, formatTime, formatPrice, getImageUrl, getCategoryColor } from '../utils/formatters';
import './EventDetailPage.css';

const parseTimeParts = (timeValue) => {
  if (!timeValue) return null;
  const str = String(timeValue).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const hh = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  const ss = match[3] ? Math.min(59, Math.max(0, parseInt(match[3], 10))) : 0;
  return { hh, mm, ss };
};

const parseDateParts = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    return { yyyy: dateValue.getFullYear(), mm: dateValue.getMonth() + 1, dd: dateValue.getDate() };
  }
  const str = String(dateValue).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { yyyy: parseInt(match[1], 10), mm: parseInt(match[2], 10), dd: parseInt(match[3], 10) };
};

const buildLocalDateTime = (dateValue, timeValue) => {
  const d = parseDateParts(dateValue);
  const t = parseTimeParts(timeValue);
  if (!d || !t) return null;
  return new Date(d.yyyy, d.mm - 1, d.dd, t.hh, t.mm, t.ss, 0);
};

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [reviewInfo, setReviewInfo] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${id}`);
        setEvent(res.data.data);
      } catch {
        toast.error('Event not found');
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, navigate]);

  useEffect(() => {
    const fetchMyReview = async () => {
      if (!user || !event) {
        setReviewInfo(null);
        return;
      }
      setReviewLoading(true);
      try {
        const res = await api.get(`/reviews/events/${id}/me`);
        setReviewInfo(res.data.data || null);
      } catch (err) {
        // If the user has no review or the request fails, we can still allow submitting later.
        setReviewInfo(null);
      } finally {
        setReviewLoading(false);
      }
    };
    fetchMyReview();
  }, [id, user, event]);

  const handlePurchase = async () => {
    if (!user) { toast.info('Please sign in to purchase tickets'); navigate('/login'); return; }
    setBuying(true);
    try {
      await api.post('/tickets/purchase', { event_id: id, quantity });
      window.dispatchEvent(new CustomEvent('eventhub:notifications:refresh'));
      toast.success(`🎟️ ${quantity} ticket${quantity > 1 ? 's' : ''} purchased! Check your dashboard.`);
      // Refresh event to show updated seats
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed. Try again.');
    } finally {
      setBuying(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: event.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleSubmitReview = async () => {
    if (!user) { toast.info('Please sign in to leave feedback'); navigate('/login'); return; }
    setReviewSubmitting(true);
    try {
      await api.post(`/reviews/events/${id}`, {
        rating: reviewRating,
        feedback: reviewFeedback,
      });
      toast.success('Thank you! Your feedback was submitted.');
      setShowReviewForm(false);
      const res = await api.get(`/reviews/events/${id}/me`);
      setReviewInfo(res.data.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return <div style={{ paddingTop: 68 }}><Loader fullPage /></div>;
  if (!event) return null;

  const imageUrl = getImageUrl(event.poster_url);
  const mapQuery = encodeURIComponent(event.address || event.location);
  const isSoldOut = event.available_seats === 0;
  const eventEnd = buildLocalDateTime(event.event_date, event.end_time || event.event_time);
  const isExpired = Boolean(eventEnd && new Date() > eventEnd);
  const totalCost = (parseFloat(event.price) * quantity).toFixed(2);

  return (
    <div className="event-detail" style={{ paddingTop: 68 }}>
      {/* Back */}
      <div className="container" style={{ padding: '1rem 1.5rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ paddingLeft: 0 }}>
          <ArrowLeft size={15} /> Back to Events
        </button>
      </div>

      <div className="container event-detail__grid">
        {/* ── Main ────────── */}
        <div className="event-detail__main">
          {/* Image */}
          <div className="event-detail__img-wrap">
            {imageUrl ? (
              <img src={imageUrl} alt={event.title} className="event-detail__img" />
            ) : (
              <div className="event-detail__img-placeholder"><Calendar size={64} /></div>
            )}
            <div className="event-detail__img-overlay">
              <span className={`badge ${getCategoryColor(event.category)}`}>{event.category}</span>
              <button className="event-detail__share" onClick={handleShare}><Share2 size={16} /></button>
            </div>
          </div>

          {/* Info */}
          <div className="event-detail__info card">
            <div className="card-body">
              <h1 className="event-detail__title">{event.title}</h1>
              <p className="event-detail__org">Organized by <strong>{event.organizer_name || 'EventHub'}</strong></p>

              <div className="event-detail__meta-grid">
                <div className="event-detail__meta-item">
                  <Calendar size={18} />
                  <div><span>Date</span><strong>{formatDate(event.event_date)}</strong></div>
                </div>
                <div className="event-detail__meta-item">
                  <Clock size={18} />
                  <div><span>Time</span><strong>{formatTime(event.event_time)}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</strong></div>
                </div>
                <div className="event-detail__meta-item">
                  <MapPin size={18} />
                  <div><span>Location</span><strong>{event.location}</strong></div>
                </div>
                <div className="event-detail__meta-item">
                  <Users size={18} />
                  <div><span>Seats Available</span><strong>{event.available_seats} / {event.total_seats}</strong></div>
                </div>
              </div>

              {event.description && (
                <>
                  <div className="divider" />
                  <h3>About this Event</h3>
                  <p style={{ marginTop: '0.75rem', lineHeight: 1.8 }}>{event.description}</p>
                </>
              )}

              {/* Map */}
              <div className="divider" />
              <div className="event-detail__map-section">
                <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                  <h3>Location</h3>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    <ExternalLink size={13} /> Open in Maps
                  </a>
                </div>
                <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>{event.address || event.location}</p>
                {showMap ? (
                  <iframe
                    title="Event Location"
                    className="event-detail__map-iframe"
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                  />
                ) : (
                  <button className="event-detail__map-toggle" onClick={() => setShowMap(true)}>
                    <MapPin size={16} /> Show Map
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Ticket Sidebar ────────── */}
        <aside className="event-detail__sidebar">
          <div className="card event-detail__ticket-card">
            <div className="card-body">
              <div className="event-detail__price-row">
                <div>
                  <span className="event-detail__price">{formatPrice(event.price)}</span>
                  <span className="event-detail__per"> / per ticket</span>
                </div>
                {isSoldOut && <span className="badge badge-red">Sold Out</span>}
                {!isSoldOut && isExpired && <span className="badge badge-gray">Closed</span>}
              </div>

              {!isSoldOut && !isExpired && (
                <>
                  <div className="divider" />
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <div className="event-detail__qty">
                      <button className="event-detail__qty-btn" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>−</button>
                      <span>{quantity}</span>
                      <button className="event-detail__qty-btn" onClick={() => setQuantity(q => Math.min(event.available_seats, q + 1, 10))} disabled={quantity >= Math.min(event.available_seats, 10)}>+</button>
                    </div>
                  </div>
                  {parseFloat(event.price) > 0 && (
                    <div className="event-detail__total">
                      <span>Total</span>
                      <strong>Rs. {parseFloat(totalCost).toLocaleString()}</strong>
                    </div>
                  )}
                </>
              )}

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
                onClick={handlePurchase}
                disabled={isSoldOut || isExpired || buying}
              >
                {buying ? 'Processing...' : isSoldOut ? 'Sold Out' : isExpired ? 'Registration Closed' : <><Ticket size={16} /> Get Tickets</>}
              </button>

              {isExpired && (
                <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  This event has ended. Ticket purchase is disabled.
                </p>
              )}

              {!user && (
                <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  <Link to="/login" style={{ color: 'var(--teal-dark)', fontWeight: 600 }}>Sign in</Link> to purchase
                </p>
              )}

              <div className="divider" />
              <div className="event-detail__ticket-info">
                <div><Tag size={13} /><span>{parseFloat(event.price) === 0 ? 'Free event' : 'Instant ticket delivery'}</span></div>
                <div><Users size={13} /><span>{event.available_seats} seats remaining</span></div>
                <div><Calendar size={13} /><span>{formatDate(event.event_date)}</span></div>
              </div>

              <div className="divider" />
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '0.6rem' }}>Feedback & Rating</h3>

                {reviewLoading && <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Loading...</p>}

                {!reviewLoading && !user && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <Link to="/login" style={{ color: 'var(--teal-dark)', fontWeight: 600 }}>Sign in</Link> after the event ends to leave feedback.
                  </p>
                )}

                {/* Organizer cannot review their own event */}
                {!reviewLoading && user && event && String(event.organizer_id) === String(user.id) && (
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    As the organizer, you cannot review your own event.
                  </p>
                )}

                {!reviewLoading && user && event && String(event.organizer_id) !== String(user.id) && !isExpired && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Feedback is available after the event ends.
                  </p>
                )}

                {!reviewLoading && user && event && String(event.organizer_id) !== String(user.id) && isExpired && reviewInfo && !reviewInfo.hasTicket && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Only attendees can leave feedback.
                  </p>
                )}

                {!reviewLoading && user && event && String(event.organizer_id) !== String(user.id) && isExpired && reviewInfo && reviewInfo.hasTicket && (
                  <>
                    {!showReviewForm && !reviewInfo.hasReview && (
                      <button
                        className="btn btn-accent"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                        onClick={() => {
                          setShowReviewForm(true);
                          setReviewRating(5);
                          setReviewFeedback('');
                        }}
                      >
                        Give feedback & rating
                      </button>
                    )}

                    {!showReviewForm && reviewInfo.hasReview && (
                      <>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
                          Your rating: <strong>{reviewInfo.myReview?.rating}/5</strong>
                        </p>
                        {reviewInfo.myReview?.feedback && (
                          <p style={{ marginTop: '0.35rem', fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            “{reviewInfo.myReview.feedback}”
                          </p>
                        )}
                        <button
                          className="btn btn-accent"
                          style={{ width: '100%', marginTop: '0.75rem' }}
                          onClick={() => {
                            setShowReviewForm(true);
                            setReviewRating(reviewInfo.myReview?.rating || 5);
                            setReviewFeedback(reviewInfo.myReview?.feedback || '');
                          }}
                        >
                          Edit feedback
                        </button>
                      </>
                    )}

                    {showReviewForm && (
                      <>
                        <div className="form-group" style={{ marginTop: '0.75rem' }}>
                          <label className="form-label">Rating (1-5)</label>
                          <select
                            className="form-control form-select"
                            value={reviewRating}
                            onChange={(e) => setReviewRating(parseInt(e.target.value, 10))}
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Feedback</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={reviewFeedback}
                            onChange={(e) => setReviewFeedback(e.target.value)}
                            placeholder="Share your experience..."
                          />
                        </div>

                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', marginTop: '0.5rem' }}
                          onClick={handleSubmitReview}
                          disabled={reviewSubmitting}
                        >
                          {reviewSubmitting ? 'Saving...' : 'Submit'}
                        </button>

                        <button
                          className="btn btn-ghost"
                          style={{ width: '100%', marginTop: '0.4rem' }}
                          onClick={() => setShowReviewForm(false)}
                          disabled={reviewSubmitting}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </>
                )}

              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EventDetailPage;
