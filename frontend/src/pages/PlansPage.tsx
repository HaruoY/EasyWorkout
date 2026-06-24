import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import { WorkoutPlan } from '../utils/types';

const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

interface ExerciseDraft {
  exerciseName: string;
  targetSets: number;
  targetReps: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [exercises, setExercises] = useState<ExerciseDraft[]>([
    { exerciseName: '', targetSets: 3, targetReps: '8-12' },
  ]);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    const data = await api.post('listPlans');
    setPlans(data.plans);
    setLoading(false);
  }

  function addExerciseRow() {
    setExercises([...exercises, { exerciseName: '', targetSets: 3, targetReps: '8-12' }]);
  }

  function updateExercise(index: number, field: keyof ExerciseDraft, value: string | number) {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  }

  function removeExercise(index: number) {
    setExercises(exercises.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validExercises = exercises.filter((ex) => ex.exerciseName.trim() !== '');
    await api.post('createPlan', {
      name,
      dayOfWeek: dayOfWeek !== '' ? Number(dayOfWeek) : undefined,
      exercises: validExercises,
    });
    setName('');
    setDayOfWeek('');
    setExercises([{ exerciseName: '', targetSets: 3, targetReps: '8-12' }]);
    setShowForm(false);
    loadPlans();
  }

  async function handleDelete(id: number) {
    if (!confirm("Eliminare questa scheda? L'azione non è reversibile.")) return;
    await api.post('deletePlan', { planId: id });
    loadPlans();
  }

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 26 }}>Le tue schede</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annulla' : '+ Nuova scheda'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ marginTop: 20 }}>
          <span className="card-label">Nuova scheda</span>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="planName">Nome scheda</label>
              <input
                id="planName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Push Day"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="planDay">Giorno della settimana (opzionale)</label>
              <select id="planDay" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                <option value="">Nessuno</option>
                {DAY_NAMES.map((day, idx) => (
                  <option key={idx} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="card-label" style={{ marginTop: 16 }}>
            Esercizi
          </span>
          {exercises.map((ex, idx) => (
            <div className="exercise-row" key={idx}>
              <input
                placeholder="Nome esercizio"
                value={ex.exerciseName}
                onChange={(e) => updateExercise(idx, 'exerciseName', e.target.value)}
              />
              <input
                type="number"
                placeholder="Serie"
                value={ex.targetSets}
                onChange={(e) => updateExercise(idx, 'targetSets', Number(e.target.value))}
              />
              <input
                placeholder="Rip. (es. 8-12)"
                value={ex.targetReps}
                onChange={(e) => updateExercise(idx, 'targetReps', e.target.value)}
              />
              <button
                type="button"
                className="btn btn-rust btn-small"
                onClick={() => removeExercise(idx)}
                aria-label="Rimuovi esercizio"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-small" onClick={addExerciseRow} style={{ marginTop: 12 }}>
            + Aggiungi esercizio
          </button>

          <div style={{ marginTop: 20 }}>
            <button type="submit" className="btn btn-sage">
              Salva scheda
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--grey-meta)' }}>Caricamento…</p>
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <h3>Nessuna scheda ancora.</h3>
          <p>Crea la tua prima scheda di allenamento per iniziare a tracciare i progressi.</p>
        </div>
      ) : (
        <div className="plan-grid" style={{ marginTop: 20 }}>
          {plans.map((plan) => (
            <div className="card" key={plan.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: 18 }}>{plan.name}</h3>
                {plan.day_of_week !== null && plan.day_of_week !== undefined && (
                  <span className="day-badge">{DAY_NAMES[plan.day_of_week]}</span>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--grey-meta)', margin: '8px 0' }}>
                {plan.exercises.length} esercizi
              </p>
              <ul style={{ paddingLeft: 18, fontSize: 14, margin: '8px 0' }}>
                {plan.exercises.slice(0, 4).map((ex, i) => (
                  <li key={i} className="mono" style={{ fontSize: 13 }}>
                    {ex.exercise_name} — {ex.target_sets}×{ex.target_reps}
                  </li>
                ))}
                {plan.exercises.length > 4 && (
                  <li style={{ fontSize: 13, color: 'var(--grey-meta)' }}>
                    +{plan.exercises.length - 4} altri
                  </li>
                )}
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Link to={`/log?planId=${plan.id}`} className="btn btn-small btn-sage">
                  Avvia sessione
                </Link>
                <button className="btn btn-small btn-rust" onClick={() => handleDelete(plan.id)}>
                  Elimina
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
