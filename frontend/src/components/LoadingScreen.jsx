import React from 'react';

const LoadingScreen = () => {
  return (
    <>
      <style>{`
        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: #000000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          /* The screen itself will fade out after the loading is done */
          animation: fadeOutScreen 0.5s ease-in-out 2.5s forwards;
        }

        .loading-logo-container {
          animation: logoEnter 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          margin-bottom: 40px;
        }

        .loading-logo-image {
          width: 250px;
          height: auto;
          animation: logoPulse 2s ease-in-out infinite alternate;
        }

        .fallback-logo {
          font-size: 4rem;
          color: #d4af37;
          font-weight: 900;
          letter-spacing: 2px;
          animation: logoPulse 2s ease-in-out infinite alternate;
        }
        
        .fallback-logo span {
          color: #e0e0e0;
        }

        .loading-bar-container {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          opacity: 0;
          animation: fadeIn 0.8s ease-out 0.5s forwards;
        }

        .loading-bar-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #d4af37, #f3e5ab, #d4af37);
          border-radius: 4px;
          animation: loadProgress 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes logoEnter {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes logoPulse {
          0% { filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.2)); transform: scale(0.98); }
          100% { filter: drop-shadow(0 0 35px rgba(212, 175, 55, 0.7)) brightness(1.2); transform: scale(1.02); }
        }

        @keyframes loadProgress {
          0% { width: 0%; }
          30% { width: 40%; }
          70% { width: 80%; }
          100% { width: 100%; }
        }

        @keyframes fadeIn {
          to { opacity: 1; }
        }

        @keyframes fadeOutScreen {
          to { opacity: 0; visibility: hidden; }
        }
      `}</style>

      <div className="loading-screen">
        <div className="loading-logo-container">
          {/* Attempt to load the user's high-res logo from public/betx-logo.png */}
          <img 
            src="/betx-logo.png" 
            alt="BETX Logo" 
            className="loading-logo-image" 
            onError={(e) => {
              // Fallback to CSS logo if the image isn't found
              e.target.style.display = 'none';
              document.getElementById('fallback-logo').style.display = 'block';
            }}
          />
          <div id="fallback-logo" className="fallback-logo" style={{ display: 'none' }}>
            BET<span>X</span>
          </div>
        </div>
        <div className="loading-bar-container">
          <div className="loading-bar-fill"></div>
        </div>
      </div>
    </>
  );
};

export default LoadingScreen;
