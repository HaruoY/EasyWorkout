import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import RestTimer from '../components/RestTimer';
import api from '../api/client';
import { WorkoutPlan, PlanExercise } from '../utils/types';

interface SetDraft {
  exerciseName: string;
  baseExerciseName: string; // nome originale dell'esercizio in scheda, per recuperare le varianti disponibili
  setNumber: number;
  reps: string;
  weightKg: string;
  done: boolean; // serie già registrata in questa sessione di editing live (fa partire il timer)
}

export default function LogSessionPage() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const sessionId = searchParams.get('sessionId'); // presente solo in modalità "modifica sessione esistente"
  const navigate = useNavigate();

  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState<SetDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [restSeconds, setRestSeconds] = useState(90);
  const [timerKey, setTimerKey] = useState(0);
  const [showTimer, setShowTimer] = useState(false);

  // Mappa nome esercizio -> varianti disponibili, per il selettore nel form
  const [variantsByExercise, setVariantsByExercise] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (sessionId) {
      loadExistingSession(sessionId);
    } else if (planId) {
      loadPlan(planId);
    } else {
      setSets([{ exerciseName: '', baseExerciseName: '', setNumber: 1, reps: '', weightKg: '', done: false }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, sessionId]);

  function buildVariantsMap(exercises: PlanExercise[]): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    exercises.forEach((ex) => {
      const name = ex.exercise_name || '';
      map[name] = ex.variants || [];
    });
    return map;
  }

  async function loadPlan(id: string) {
    setLoading(true);
    const data = await api.post('getPlan', { planId: id });
    setPlan(data.plan);
    setRestSeconds(data.plan.rest_seconds ?? 90);
    setVariantsByExercise(buildVariantsMap(data.plan.exercises));

    const initialSets: SetDraft[] = [];
    data.plan.exercises.forEach((ex: any) => {
      for (let i = 1; i <= ex.target_sets; i++) {
        initialSets.push({
          exerciseName: ex.exercise_name,
          baseExerciseName: ex.exercise_name,
          setNumber: i,
          reps: '',
          weightKg: '',
          done: false,
        });
      }
    });
    setSets(initialSets);
    setLoading(false);
  }

  async function loadExistingSession(id: string) {
    setLoading(true);
    const listData = await api.post('listSessions');
    const session = listData.sessions.find((s: any) => String(s.id) === id);
    if (!session) {
      setLoading(false);
      return;
    }

    setSessionDate(session.session_date);
    setNotes(session.notes || '');

    if (session.plan_id) {
      try {
        const planData = await api.post('getPlan', { planId: session.plan_id });
        setPlan(planData.plan);
        setRestSeconds(planData.plan.rest_seconds ?? 90);
        setVariantsByExercise(buildVariantsMap(planData.plan.exercises));
      } catch {
        // La scheda originale potrebbe essere stata eliminata: si procede comunque con le sole serie
      }
    }

    setSets(
      session.entries.map((en: any) => ({
        exerciseName: en.exercise_name,
        baseExerciseName: en.exercise_name,
        setNumber: en.set_number,
        reps: String(en.reps),
        weightKg: String(en.weight_kg),
        done: true,
      }))
    );
    setLoading(false);
  }

  function updateSet(index: number, field: keyof SetDraft, value: string | boolean) {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: value } as SetDraft;
    setSets(updated);
  }

  function markSetDone(index: number) {
    const set = sets[index];
    if (!set.reps) return; // non far partire il timer su una serie senza dati
    updateSet(index, 'done', true);
    setTimerKey((k) => k + 1);
    setShowTimer(true);
  }

  function addFreeSet() {
    setSets([
      ...sets,
      { exerciseName: '', baseExerciseName: '', setNumber: 1, reps: '', weightKg: '', done: false },
    ]);
  }

  function removeSet(index: number) {
    setSets(sets.filter((_, i) => i !== index));
  }

  // Raggruppa le serie per nome esercizio per la visualizzazione
  const groupedByExercise = sets.reduce<Record<string, { set: SetDraft; index: number }[]>>(
    (acc, set, index) => {
      const key = set.exerciseName || '(esercizio libero)';
      if (!acc[key]) acc[key] = [];
      acc[key].push({ set, index });
      return acc;
    },
    {}
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const validEntries = sets
      .filter((s) => s.exerciseName.trim() !== '' && s.reps !== '')
      .map((s) => ({
        exerciseName: s.exerciseName,
        setNumber: s.setNumber,
        reps: Number(s.reps),
        weightKg: s.weightKg ? Number(s.weightKg) : 0,
      }));

    try {
      if (sessionId) {
        await api.post('updateSession', {
          sessionId,
          planId: plan ? plan.id : undefined,
          planName: plan ? plan.name : undefined,
          sessionDate,
          notes: notes || undefined,
          entries: validEntries,
        });
      } else {
        await api.post('createSession', {
          planId: plan ? plan.id : undefined,
          planName: plan ? plan.name : undefined,
          sessionDate,
          notes: notes || undefined,
          entries: validEntries,
        });
      }
      navigate('/');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p style={{ color: 'var(--grey-meta)' }}>Caricamento…</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>
        {sessionId ? 'Modifica sessione' : plan ? `Sessione: ${plan.name}` : 'Registra allenamento'}
      </h1>
      <p style={{ color: 'var(--grey-meta)', marginBottom: 24 }}>
        Inserisci ripetizioni e carico per ogni serie svolta. Premi ✓ su una serie per avviare il timer di recupero.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sessionDate">Data</label>
              <input
                id="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="notes">Note (opzionale)</label>
              <input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="es. Buona energia, recupero rapido"
              />
            </div>
          </div>
        </div>

        {Object.entries(groupedByExercise).map(([exerciseName, rows]) => {
          const baseExerciseName = rows[0]?.set.baseExerciseName || exerciseName;
          const variants = variantsByExercise[baseExerciseName] || [];

          return (
            <div className="card" key={exerciseName}>
              <span className="card-label">{exerciseName}</span>

              {variants.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <label
                    className="mono"
                    style={{ fontSize: 11, color: 'var(--grey-meta)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}
                  >
                    Cambia esercizio (varianti disponibili)
                  </label>
                  <select
                    value={exerciseName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      rows.forEach(({ index }) => updateSet(index, 'exerciseName', newName));
                    }}
                    style={{ maxWidth: 280 }}
                  >
                    <option value={baseExerciseName}>{baseExerciseName} (originale)</option>
                    {variants.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                className="mono"
                style={{ fontSize: 11, color: 'var(--grey-meta)', display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr auto auto', gap: 8, marginBottom: 4 }}
              >
                <span>SET</span>
                <span>ESERCIZIO</span>
                <span>RIP.</span>
                <span>KG</span>
                <span></span>
                <span></span>
              </div>
              {rows.map(({ set, index }) => (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr 1fr 1fr auto auto',
                    gap: 8,
                    alignItems: 'center',
                    padding: '6px 0',
                  }}
                >
                  <span className="set-number">{set.setNumber}</span>
                  <input
                    placeholder="Nome esercizio"
                    value={set.exerciseName}
                    onChange={(e) => updateSet(index, 'exerciseName', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Rip."
                    value={set.reps}
                    onChange={(e) => updateSet(index, 'reps', e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Kg"
                    value={set.weightKg}
                    onChange={(e) => updateSet(index, 'weightKg', e.target.value)}
                  />
                  <button
                    type="button"
                    className={set.done ? 'btn btn-sage btn-small' : 'btn btn-small'}
                    onClick={() => markSetDone(index)}
                    aria-label="Segna serie completata e avvia recupero"
                    title="Segna completata e avvia il timer di recupero"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="btn btn-rust btn-small"
                    onClick={() => removeSet(index)}
                    aria-label="Rimuovi serie"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        <button type="button" className="btn" onClick={addFreeSet}>
          + Aggiungi serie libera
        </button>

        <div style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn-sage" disabled={saving}>
            {saving ? 'Salvataggio…' : sessionId ? 'Salva modifiche' : 'Salva sessione'}
          </button>
        </div>
      </form>

      {showTimer && (
        <RestTimer durationSeconds={restSeconds} resetKey={timerKey} onClose={() => setShowTimer(false)} />
      )}
    </Layout>
  );
}
