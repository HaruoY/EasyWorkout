import { useState, useEffect, FormEvent } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CalorieResult } from '../utils/types';

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentario (poco/nessun esercizio)',
  light: 'Leggero (1-3 giorni/settimana)',
  moderate: 'Moderato (3-5 giorni/settimana)',
  active: 'Attivo (6-7 giorni/settimana)',
  very_active: 'Molto attivo (lavoro fisico o atleta)',
};

const GOAL_LABELS: Record<string, string> = {
  lose: 'Perdere peso',
  maintain: 'Mantenere il peso',
  gain: 'Aumentare massa',
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    sex: 'male' as 'male' | 'female',
    birthDate: '',
    heightCm: '',
    weightKg: '',
    activityLevel: 'moderate',
    goal: 'maintain',
    formula: 'mifflin_st_jeor',
  });
  const [calorie, setCalorie] = useState<CalorieResult | null>(null);
  const [calorieError, setCalorieError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        sex: (user.sex as 'male' | 'female') || 'male',
        birthDate: user.birth_date || '',
        heightCm: user.height_cm?.toString() || '',
        weightKg: user.weight_kg?.toString() || '',
        activityLevel: user.activity_level || 'moderate',
        goal: user.goal || 'maintain',
        formula: user.formula || 'mifflin_st_jeor',
      });
    }
    fetchCalorieNeeds();
  }, [user]);

  async function fetchCalorieNeeds() {
    try {
      const data = await api.post('getCalorieNeeds');
      setCalorie(data as CalorieResult);
      setCalorieError('');
    } catch (err: any) {
      setCalorie(null);
      setCalorieError(err.message || '');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.post('updateProfile', {
        name: form.name,
        sex: form.sex,
        birthDate: form.birthDate || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        activityLevel: form.activityLevel,
        goal: form.goal,
        formula: form.formula,
      });
      await refreshUser();
      await fetchCalorieNeeds();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Il tuo profilo</h1>
      <p style={{ color: 'var(--grey-meta)', marginBottom: 24 }}>
        Questi dati alimentano il calcolo del fabbisogno calorico.
      </p>

      <div className="card">
        <span className="card-label">Fabbisogno calorico stimato</span>
        {calorie ? (
          <>
            <div className="stat-row">
              <div className="stat">
                <div className="stat-value">
                  {calorie.bmr} <span className="stat-unit">kcal</span>
                </div>
                <div className="stat-label">Metabolismo basale (BMR)</div>
              </div>
              <div className="stat">
                <div className="stat-value">
                  {calorie.tdee} <span className="stat-unit">kcal</span>
                </div>
                <div className="stat-label">Dispendio totale (TDEE)</div>
              </div>
              <div className="stat" style={{ borderLeftColor: 'var(--rust)' }}>
                <div className="stat-value">
                  {calorie.targetCalories} <span className="stat-unit">kcal</span>
                </div>
                <div className="stat-label">Target — {GOAL_LABELS[calorie.goal]}</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--grey-meta)', marginTop: 12 }}>
              Calcolato con formula {calorie.formula === 'harris_benedict' ? 'Harris-Benedict' : 'Mifflin-St Jeor'},
              livello di attività: {ACTIVITY_LABELS[calorie.activityLevel]}.
            </p>
          </>
        ) : (
          <p style={{ color: 'var(--grey-meta)', fontSize: 14 }}>
            {calorieError || 'Completa sesso, data di nascita, altezza e peso per vedere il calcolo.'}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="card">
        <span className="card-label">Dati anagrafici e biometrici</span>

        <div className="form-group">
          <label htmlFor="name">Nome</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="sex">Sesso</label>
            <select
              id="sex"
              value={form.sex}
              onChange={(e) => setForm({ ...form, sex: e.target.value as 'male' | 'female' })}
            >
              <option value="male">Uomo</option>
              <option value="female">Donna</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="birthDate">Data di nascita</label>
            <input
              id="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="heightCm">Altezza (cm)</label>
            <input
              id="heightCm"
              type="number"
              step="0.1"
              value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="weightKg">Peso (kg)</label>
            <input
              id="weightKg"
              type="number"
              step="0.1"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="activityLevel">Livello di attività</label>
            <select
              id="activityLevel"
              value={form.activityLevel}
              onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
            >
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="goal">Obiettivo</label>
            <select id="goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
              {Object.entries(GOAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="formula">Formula di calcolo</label>
          <select
            id="formula"
            value={form.formula}
            onChange={(e) => setForm({ ...form, formula: e.target.value })}
          >
            <option value="mifflin_st_jeor">Mifflin-St Jeor (più accurata, raccomandata)</option>
            <option value="harris_benedict">Harris-Benedict</option>
          </select>
        </div>

        <button type="submit" className="btn btn-sage" disabled={saving}>
          {saving ? 'Salvataggio…' : saved ? 'Salvato ✓' : 'Salva profilo'}
        </button>
      </form>
    </Layout>
  );
}
