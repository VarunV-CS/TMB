import { useEffect } from 'react';
import './Snackbar.css';

function Snackbar({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`snackbar snackbar-${type}`} role="alert">
      <span className="snackbar-icon">{getIcon()}</span>
      <span className="snackbar-message">{message}</span>
      <button className="snackbar-close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}

export default Snackbar;

