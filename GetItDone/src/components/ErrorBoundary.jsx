import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>😵</h1>
          <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Oops! Something went wrong</h2>
          <p style={{ fontSize: '1.1rem', marginBottom: '20px', opacity: 0.9 }}>
            We're sorry, but an unexpected error occurred.
          </p>
          {this.state.error && (
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '20px',
              maxWidth: '500px',
              fontSize: '0.9rem',
              fontFamily: 'monospace'
            }}>
              {this.state.error.toString()}
            </div>
          )}
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              onClick={this.handleReload}
              style={{
                background: 'white',
                color: '#667eea',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
            >
              🔄 Reload Page
            </button>
            <button 
              onClick={this.handleGoHome}
              style={{
                background: 'transparent',
                color: 'white',
                border: '2px solid white',
                padding: '10px 22px',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
            >
              🏠 Go to Login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

