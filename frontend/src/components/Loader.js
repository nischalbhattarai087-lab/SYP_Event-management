import React from 'react';

const Loader = ({ fullPage = false, size = 40 }) => {
  if (fullPage) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', flexDirection: 'column', gap: '1rem'
      }}>
        <div className="spinner" style={{ width: size, height: size }} />
        <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Loading...</p>
      </div>
    );
  }
  return <div className="spinner" style={{ width: size, height: size }} />;
};

export default Loader;
