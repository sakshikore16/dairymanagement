import React from 'react';

export default function NumberPad({ value, onChange, onConfirm }) {
  const handlePress = (char) => {
    if (char === 'C') {
      onChange('');
    } else if (char === '⌫') {
      onChange(value.slice(0, -1));
    } else {
      // Allow only numbers
      onChange(value + char);
    }
  };

  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    'C', '0', '⌫'
  ];

  return (
    <div style={{ maxWidth: '320px', margin: '0 auto' }}>
      <div 
        style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          padding: '15px', 
          backgroundColor: '#f1f5f9', 
          borderRadius: '12px', 
          textAlign: 'center', 
          marginBottom: '15px',
          border: '2px solid #cbd5e1',
          minHeight: '68px',
          color: '#0f172a'
        }}
      >
        {value || '0'}
      </div>
      <div className="numpad">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            className="numpad-btn"
            onClick={() => handlePress(key)}
            style={{
              backgroundColor: key === 'C' ? '#fecaca' : key === '⌫' ? '#e2e8f0' : '#ffffff',
              color: key === 'C' ? '#dc2626' : '#1e293b',
              border: '2px solid #cbd5e1'
            }}
          >
            {key}
          </button>
        ))}
      </div>
      {onConfirm && (
        <button
          type="button"
          className="btn btn-success"
          onClick={onConfirm}
          style={{ width: '100%', marginTop: '15px', fontSize: '20px', fontWeight: 'bold' }}
        >
          ✓ DONE / SET
        </button>
      )}
    </div>
  );
}
