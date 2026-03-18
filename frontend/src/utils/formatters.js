import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isValid(d) ? format(d, 'EEE, MMM d, yyyy') : 'Invalid date';
  } catch { return 'Invalid date'; }
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
};

export const formatPrice = (price) => {
  const p = parseFloat(price);
  if (isNaN(p)) return 'Free';
  return p === 0 ? 'Free' : `Rs. ${p.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
};

export const formatCurrency = (amount) => {
  return `Rs. ${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:5000${url}`;
};

export const getCategoryColor = (category) => {
  const map = {
    'Concert': 'badge-red',
    'Conference': 'badge-teal',
    'Workshop': 'badge-sage',
    'Festival': 'badge-yellow',
    'Sports': 'badge-teal',
    'Theater': 'badge-red',
    'Exhibition': 'badge-sage',
    'General': 'badge-sage',
  };
  return map[category] || 'badge-teal';
};
