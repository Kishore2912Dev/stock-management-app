import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminRequired = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner-overlay" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminRequired && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;
