import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SimpleApp from './pages/SimpleApp';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '13.5px',
              borderRadius: '10px',
              fontWeight: 500,
            },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Simple Clean Stock Management App */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SimpleApp />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
