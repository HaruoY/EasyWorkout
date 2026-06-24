import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { WorkoutSession, WeightLog } from '../utils/types';

export default function HomePage() {
  const { user } = useAuth();
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [sessionsRes, weightRes] = await Promise.all([
      api.post('listSessions'),
      api.post('listWeightLogs'),
    ]);
    setRecentSessions(sessionsRes.sessions.slice(0, 5));
    const logs: WeightLog[] = weightRes.logs;
    setLatestWeight(logs.length > 0 ? logs[logs.length - 1] : null);
    setLoading(false);
  }

  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Layout>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Ciao, {user?.name?.split(' ')[0]}.</h1>
      <p style={{ color: 'var(--grey-meta)', marginBottom: 24, textTransform: 'capitalize' }}>{today}</p>

      <div className="stat-row">
        <div className="card" style={{ margin: 0 }}>
          <span className="card-label">Peso attuale</span>
          <div className="stat-value">
            {latestWeight ? latestWeight.weight_kg : '—'} <span className="stat-unit">kg</span>
          </div>
          <Link to="/progress" style={{ fontSize: 13 }}>
            Aggiorna peso →
          </Link>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <span className="card-label">Sessioni registrate</span>
          <div className="stat-value">{recentSessions.length}</div>
          <Link to="/log" style={{ fontSize: 13 }}>
            Nuova sessione →
          </Link>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <span className="card-label">Le tue schede</span>
          <div className="stat-value">→</div>
          <Link to="/plans" style={{ fontSize: 13 }}>
            Vai alle schede
          </Link>
        </div>
      </div>

      <div className="section-title">Sessioni recenti</div>

      {loading ? (
        <p style={{ color: 'var(--grey-meta)' }}>Caricamento…</p>
      ) : recentSessions.length === 0 ? (
        <div className="empty-state">
          <h3>Ancora nessuna sessione.</h3>
          <p>Registra il tuo primo allenamento per iniziare a costruire lo storico.</p>
          <Link to="/log" className="btn btn-primary" style={{ marginTop: 12, display: 'inline-block' }}>
            Registra allenamento
          </Link>
        </div>
      ) : (
        recentSessions.map((session) => (
          <div className="card" key={session.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="mono" style={{ fontWeight: 700 }}>
                {new Date(session.session_date).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
              <span style={{ fontSize: 13, color: 'var(--grey-meta)' }}>
                {session.entries.length} serie registrate
              </span>
            </div>
            {session.notes && <p style={{ fontSize: 14, marginTop: 8 }}>{session.notes}</p>}
          </div>
        ))
      )}
    </Layout>
  );
}
