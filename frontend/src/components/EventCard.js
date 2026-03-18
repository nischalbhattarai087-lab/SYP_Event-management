import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Tag } from 'lucide-react';
import { formatDate, formatTime, formatPrice, getImageUrl, getCategoryColor } from '../utils/formatters';
import './EventCard.css';

const EventCard = ({ event }) => {
  const imageUrl = getImageUrl(event.poster_url);
  const isSoldOut = event.available_seats === 0;
  const isAlmostFull = !isSoldOut && event.available_seats <= 5;

  return (
    <Link to={`/events/${event.id}`} className="event-card" aria-label={`View ${event.title}`}>
      <div className="event-card__img-wrap">
        {imageUrl ? (
          <img src={imageUrl} alt={event.title} className="event-card__img" />
        ) : (
          <div className="event-card__img-placeholder">
            <Calendar size={40} />
          </div>
        )}
        <span className={`badge event-card__category ${getCategoryColor(event.category)}`}>
          {event.category}
        </span>
        {isSoldOut && <span className="event-card__sold-out">Sold Out</span>}
        {isAlmostFull && !isSoldOut && (
          <span className="event-card__almost-full">Only {event.available_seats} left</span>
        )}
      </div>

      <div className="event-card__body">
        <h3 className="event-card__title">{event.title}</h3>
        <p className="event-card__organizer">by {event.organizer_name || 'EventHub'}</p>

        <div className="event-card__meta">
          <span className="event-card__meta-item">
            <Calendar size={13} /> {formatDate(event.event_date)}
          </span>
          <span className="event-card__meta-item">
            <Clock size={13} /> {formatTime(event.event_time)}
          </span>
          <span className="event-card__meta-item">
            <MapPin size={13} /> {event.location}
          </span>
          <span className="event-card__meta-item">
            <Users size={13} /> {event.available_seats} seats left
          </span>
        </div>

        <div className="event-card__footer">
          <span className="event-card__price">
            <Tag size={13} /> {formatPrice(event.price)}
          </span>
          <span className="event-card__cta">View Details →</span>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
