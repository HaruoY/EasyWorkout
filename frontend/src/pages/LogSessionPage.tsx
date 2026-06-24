import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import { WorkoutPlan } from '../utils/types';

interface SetDraft {
  exerciseName: string;
  setNumber: number;
  reps: string;
  weightKg: string;
}

export default function LogSessionPage() {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId');
  const navigate = useNavigate();

  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState<SetDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (planId) {
      loadPlan(planId);
    } else {
      setSets([{ exerciseName: '', setNumber: 1, reps: '', weightKg: '' }]);
    }
  }, [planId]);

  async function loadPlan(id: string) {
    const data = await api.post('getPlan', { planId: id });
    setPlan(data.plan);
    // Pre-popola le serie in base al numero target per ciascun esercizio della scheda
    const initialSets: SetDraft[] = [];
    data.plan.exercises.forEach((ex: any) => {
      for (let i = 1; i <= ex.target_sets; i++) {
        initialSets.push({ exerciseName: ex.exercise_name, setNumber: i, reps: '', weightKg: '' });
      }
    });
    setSets(initialSets);
  }

  function updateSet(index: number, field: keyof SetDraft, value: string) {
    const updated = [...sets];
    updated[index] = { ...updated[index], [field]: value };
    setSets(updated);
  }

  function addFreeSet() {
    setSets([...sets, { exerciseName: '', setNumber: 1, reps: '', weightKg: '' }]);
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
      await api.post('createSession', {
        planId: plan ? plan.id : undefined,
        planName: plan ? plan.name : undefined,
        sessionDate,
        notes: notes || undefined,
        entries: validEntries,
      });
      navigate('/');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>
        {plan ? `Sessione: ${plan.name}` : 'Registra allenamento'}
      </h1>
      <p style={{ color: 'var(--grey-meta)', marginBottom: 24 }}>
        Inserisci ripetizioni e carico per ogni serie svolta.
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

        {Object.entries(groupedByExercise).map(([exerciseName, rows]) => (
          <div className="card" key={exerciseName}>
            <span className="card-label">{exerciseName}</span>
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--grey-meta)', display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr auto', gap: 10, marginBottom: 4 }}
            >
              <span>SET</span>
              <span>ESERCIZIO</span>
              <span>RIP.</span>
              <span>KG</span>
              <span></span>
            </div>
            {rows.map(({ set, index }) => (
              <div className="set-row" key={index}>
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
                  className="btn btn-rust btn-small"
                  onClick={() => removeSet(index)}
                  aria-label="Rimuovi serie"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ))}

        <button type="button" className="btn" onClick={addFreeSet}>
          + Aggiungi serie libera
        </button>

        <div style={{ marginTop: 24 }}>
          <button type="submit" className="btn btn-sage" disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva sessione'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
