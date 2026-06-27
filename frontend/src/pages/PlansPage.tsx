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
  variants: string[];
  newVariantInput: string;
}

function emptyExercise(): ExerciseDraft {
  return { exerciseName: '', targetSets: 3, targetReps: '8-12', variants: [], newVariantInput: '' };
}

export default function PlansPage() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [restSeconds, setRestSeconds] = useState(90);
  const [exercises, setExercises] = useState<ExerciseDraft[]>([emptyExercise()]);

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
    setExercises([...exercises, emptyExercise()]);
  }

  function updateExercise(index: number, field: keyof ExerciseDraft, value: string | number | string[]) {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  }

  function removeExercise(index: number) {
    setExercises(exercises.filter((_, i) => i !== index));
  }

  function addVariant(index: number) {
    const ex = exercises[index];
    const value = ex.newVariantInput.trim();
    if (!value) return;
    updateExercise(index, 'variants', [...ex.variants, value]);
    updateExercise(index, 'newVariantInput', '');
  }

  function removeVariant(exIndex: number, variantIndex: number) {
    const ex = exercises[exIndex];
    updateExercise(
      exIndex,
      'variants',
      ex.variants.filter((_, i) => i !== variantIndex)
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validExercises = exercises
      .filter((ex) => ex.exerciseName.trim() !== '')
      .map((ex) => ({
        exerciseName: ex.exerciseName,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        variants: ex.variants,
      }));
    await api.post('createPlan', {
      name,
      dayOfWeek: dayOfWeek !== '' ? Number(dayOfWeek) : undefined,
      restSeconds,
      exercises: validExercises,
    });
    setName('');
    setDayOfWeek('');
    setRestSeconds(90);
    setExercises([emptyExercise()]);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 26 }}>Le tue schede</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/import-pdf" className="btn btn-small">
            Importa da PDF
          </Link>
          <button className="btn btn-primary btn-small" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Annulla' : '+ Nuova scheda'}
          </button>
        </div>
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

          <div className="form-group" style={{ maxWidth: 220 }}>
            <label htmlFor="restSeconds">Tempo di recupero tra le serie (secondi)</label>
            <input
              id="restSeconds"
              type="number"
              min={0}
              step={5}
              value={restSeconds}
              onChange={(e) => setRestSeconds(Number(e.target.value))}
            />
          </div>

          <span className="card-label" style={{ marginTop: 16 }}>
            Esercizi
          </span>
          {exercises.map((ex, idx) => (
            <div key={idx} style={{ borderBottom: '1px dashed var(--grid-line)', paddingBottom: 12, marginBottom: 12 }}>
              <div className="exercise-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
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

              <div style={{ marginTop: 6 }}>
                {ex.variants.map((v, vIdx) => (
                  <span className="variant-tag" key={vIdx}>
                    {v}
                    <button type="button" onClick={() => removeVariant(idx, vIdx)} aria-label="Rimuovi variante">
                      ✕
                    </button>
                  </span>
                ))}
                <div className="variant-input-row">
                  <input
                    placeholder="Esercizio alternativo (es. Panca con manubri)"
                    value={ex.newVariantInput}
                    onChange={(e) => updateExercise(idx, 'newVariantInput', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addVariant(idx);
                      }
                    }}
                  />
                  <button type="button" className="btn btn-small" onClick={() => addVariant(idx)}>
                    + Variante
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-small" onClick={addExerciseRow}>
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
                {plan.exercises.length} esercizi · recupero {plan.rest_seconds ?? 90}s
              </p>
              <ul style={{ paddingLeft: 18, fontSize: 14, margin: '8px 0' }}>
                {plan.exercises.slice(0, 4).map((ex, i) => (
                  <li key={i} className="mono" style={{ fontSize: 13 }}>
                    {ex.exercise_name} — {ex.target_sets}×{ex.target_reps}
                    {ex.variants && ex.variants.length > 0 && (
                      <span style={{ color: 'var(--rust)' }}> · {ex.variants.length} variante/i</span>
                    )}
                  </li>
                ))}
                {plan.exercises.length > 4 && (
                  <li style={{ fontSize: 13, color: 'var(--grey-meta)' }}>
                    +{plan.exercises.length - 4} altri
                  </li>
                )}
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
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
