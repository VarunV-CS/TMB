import { Navigate } from 'react-router-dom';

function PrivateRoute({ children }) {
  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/" replace />;
  }
  
  return children;
}

export default PrivateRoute;
