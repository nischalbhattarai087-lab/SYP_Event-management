import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import './FilterBar.css';

const CATEGORIES = ['All', 'Concert', 'Conference', 'Workshop', 'Festival', 'Sports', 'Theater', 'Exhibition', 'General'];

const FilterBar = ({ filters, onChange, onReset }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = filters.category !== 'All' || filters.date_from || filters.date_to || filters.location;

  return (
    <div className="filter-bar">
      {/* Search */}
      <div className="filter-bar__search">
        <Search size={16} className="filter-bar__search-icon" />
        <input
          type="text"
          className="filter-bar__search-input"
          placeholder="Search events by name, description..."
          value={filters.search || ''}
          onChange={e => handleChange('search', e.target.value)}
        />
        {filters.search && (
          <button className="filter-bar__clear-search" onClick={() => handleChange('search', '')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="filter-bar__categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`filter-bar__cat-btn${(filters.category === cat || (!filters.category && cat === 'All')) ? ' active' : ''}`}
            onClick={() => handleChange('category', cat === 'All' ? '' : cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Advanced toggle row */}
      <div className="filter-bar__row">
        <button
          className={`filter-bar__advanced-btn${showAdvanced ? ' active' : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter size={14} />
          {showAdvanced ? 'Hide Filters' : 'More Filters'}
          {hasActiveFilters && <span className="filter-bar__dot" />}
        </button>
        {hasActiveFilters && (
          <button className="filter-bar__reset" onClick={onReset}>
            <X size={13} /> Reset All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="filter-bar__advanced fade-in">
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input type="date" className="form-control" value={filters.date_from || ''} onChange={e => handleChange('date_from', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input type="date" className="form-control" value={filters.date_to || ''} onChange={e => handleChange('date_to', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input type="text" className="form-control" placeholder="e.g. Kathmandu" value={filters.location || ''} onChange={e => handleChange('location', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
