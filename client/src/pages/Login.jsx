import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../services/api';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) {
      setError('Please enter username and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiLogin(form);
      const { token, user } = res.data;
      loginUser(user, token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">K</div>
          <div className="login-logo-text">
            <h2>Kishore Cloth & Cut Pieces</h2>
            <p>Stock Management System</p>
          </div>
        </div>

        <h2 className="login-title">Welcome back</h2>
        <p className="login-subtitle">Sign in to manage your stock</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label required" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-control"
              placeholder="Enter username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label required" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPwd ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  padding: '2px',
                }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '11px' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await apiLogin({ username: 'admin', password: 'admin123' });
                  const { token, user } = res.data;
                  loginUser(user, token);
                  navigate('/');
                } catch {
                  setError('Could not sign in. Please try again.');
                } finally {
                  setLoading(false);
                }
              }}
              style={{
                width: '100%',
                background: '#f0fdf4',
                color: '#15803d',
                border: '2px solid #86efac',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>⚡</span>
              <span>1-Tap Instant Sign In</span>
            </button>
            <p style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
              No typing needed — tap above to start managing stock
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
