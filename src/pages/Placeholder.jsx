import React from 'react';

const Placeholder = ({ title }) => {
    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            background: 'radial-gradient(circle at center, #1a1a1a 0%, #030303 100%)'
        }}>
            <h1 style={{
                fontSize: '48px',
                fontWeight: '800',
                color: '#fff',
                textTransform: 'uppercase',
                marginBottom: '20px'
            }}>
                {title}
            </h1>
            <p style={{ color: '#888' }}>Coming Soon</p>
        </div>
    );
};

export default Placeholder;
