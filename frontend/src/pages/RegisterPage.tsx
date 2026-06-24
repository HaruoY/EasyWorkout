import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/profile');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Errore durante la registrazione. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell" style={{ maxWidth: 420, paddingTop: 80 }}>
      <h1 style={{ fontSize: 32, marginBottom: 4 }}>Apri il diario.</h1>
      <p style={{ color: 'var(--grey-meta)', marginBottom: 28 }}>
        Crea un account per iniziare a tracciare i tuoi allenamenti.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Nome</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
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
            minLength={8}
            required
          />
          <span style={{ fontSize: 12, color: 'var(--grey-meta)' }}>Minimo 8 caratteri.</span>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Creazione account…' : 'Crea account'}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, color: 'var(--grey-meta)' }}>
        Hai già un account? <Link to="/login">Accedi</Link>
      </p>
    </div>
  );
}
