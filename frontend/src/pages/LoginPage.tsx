import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore di accesso. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell" style={{ maxWidth: 420, paddingTop: 80 }}>
      <h1 style={{ fontSize: 32, marginBottom: 4 }}>Bentornato.</h1>
      <p style={{ color: 'var(--grey-meta)', marginBottom: 28 }}>Accedi al tuo diario di allenamento.</p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, color: 'var(--grey-meta)' }}>
        Non hai un account? <Link to="/register">Registrati</Link>
      </p>
    </div>
  );
}
