import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f1f3f6',
      color: '#212121',
      textAlign: 'center',
      fontFamily: 'sans-serif',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '10px' }}>404</h1>
      <img 
        src="https://img1a.flixcart.com/www/promos/illustration/20150901_1605058/error-500.png" 
        alt="Not Found" 
        style={{ maxWidth: '300px', margin: '20px 0' }} 
      />
      <h2 style={{ fontSize: '18px', fontWeight: 'normal', marginBottom: '30px' }}>
        Unfortunately the page you are looking for has been moved or deleted
      </h2>
      <button 
        onClick={() => navigate('/')}
        style={{
          backgroundColor: '#2874f0',
          color: 'white',
          border: 'none',
          padding: '12px 30px',
          fontSize: '16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px 0 rgba(0,0,0,.2)'
        }}
      >
        GO TO HOMEPAGE
      </button>
    </div>
  );
};

export default NotFound;
