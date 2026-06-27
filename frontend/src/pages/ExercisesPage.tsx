import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/client';
import { ExerciseHistoryEntry } from '../utils/types';

interface EditDraft {
  reps: string;
  weightKg: string;
}

export default function ExercisesPage() {
  const [exerciseList, setExerciseList] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({ reps: '', weightKg: '' });

  useEffect(() => {
    loadExerciseList();
  }, []);

  async function loadExerciseList() {
    setLoading(true);
    const data = await api.post('listExercises');
    setExerciseList(data.exercises);
    setLoading(false);
  }

  async function openExercise(name: string) {
    setSelected(name);
    setLoadingHistory(true);
    const data = await api.post('exerciseHistoryDetail', { exerciseName: name });
    setHistory(data.entries);
    setLoadingHistory(false);
  }

  function startEdit(entry: ExerciseHistoryEntry) {
    setEditingId(entry.id);
    setEditDraft({ reps: String(entry.reps), weightKg: String(entry.weight_kg) });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(entryId: number) {
    await api.post('updateSessionEntry', {
      entryId,
      reps: Number(editDraft.reps),
      weightKg: Number(editDraft.weightKg),
    });
    setEditingId(null);
    if (selected) openExercise(selected);
  }

  async function deleteEntry(entryId: number) {
    if (!confirm('Eliminare questa serie dallo storico? Non sarà più conteggiata nei grafici di progressione.')) return;
    await api.post('deleteSessionEntry', { entryId });
    if (selected) openExercise(selected);
  }

  const personalBest =
    history.length > 0 ? Math.max(...history.map((h) => h.weight_kg)) : null;

  return (
    <Layout>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Esercizi</h1>
      <p style={{ color: 'var(--grey-meta)', marginBottom: 24 }}>
        Catalogo di tutti gli esercizi svolti. Apri uno storico per correggere o eliminare una serie.
      </p>

      {!selected ? (
        loading ? (
          <p style={{ color: 'var(--grey-meta)' }}>Caricamento…</p>
        ) : exerciseList.length === 0 ? (
          <div className="empty-state">
            <h3>Ancora nessun esercizio registrato.</h3>
            <p>Registra una sessione di allenamento per popolare questo catalogo.</p>
          </div>
        ) : (
          exerciseList.map((name) => (
            <div className="exercise-list-item" key={name}>
              <span>{name}</span>
              <button className="btn btn-small" onClick={() => openExercise(name)}>
                Apri storico
              </button>
            </div>
          ))
        )
      ) : (
        <>
          <button className="btn btn-small" onClick={() => setSelected(null)} style={{ marginBottom: 16 }}>
            ← Torna al catalogo
          </button>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <span className="card-label">{selected}</span>
              {personalBest !== null && (
                <span className="mono" style={{ fontSize: 13, color: 'var(--sage)' }}>
                  Massimale storico: {personalBest} kg
                </span>
              )}
            </div>

            {loadingHistory ? (
              <p style={{ color: 'var(--grey-meta)', fontSize: 14 }}>Caricamento storico…</p>
            ) : history.length === 0 ? (
              <p style={{ color: 'var(--grey-meta)', fontSize: 14 }}>Nessuna serie registrata per questo esercizio.</p>
            ) : (
              <>
                <div
                  className="mono history-entry-row"
                  style={{ color: 'var(--grey-meta)', fontSize: 11, textTransform: 'uppercase', borderBottom: '1.5px solid var(--ink)' }}
                >
                  <span>Data</span>
                  <span>Set</span>
                  <span>Rip.</span>
                  <span>Kg</span>
                  <span className="history-rpe-col">RPE</span>
                  <span></span>
                </div>
                {history.map((entry) => (
                  <div className="history-entry-row" key={entry.id}>
                    <span className="mono">
                      {entry.session_date
                        ? new Date(entry.session_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : '—'}
                    </span>
                    <span className="mono">#{entry.set_number}</span>

                    {editingId === entry.id ? (
                      <>
                        <input
                          type="number"
                          value={editDraft.reps}
                          onChange={(e) => setEditDraft({ ...editDraft, reps: e.target.value })}
                          style={{ padding: 4, fontSize: 12 }}
                        />
                        <input
                          type="number"
                          step="0.5"
                          value={editDraft.weightKg}
                          onChange={(e) => setEditDraft({ ...editDraft, weightKg: e.target.value })}
                          style={{ padding: 4, fontSize: 12 }}
                        />
                        <span className="history-rpe-col mono">{entry.rpe ?? '—'}</span>
                        <span style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-small btn-sage" onClick={() => saveEdit(entry.id)}>
                            ✓
                          </button>
                          <button className="btn btn-small" onClick={cancelEdit}>
                            ✕
                          </button>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="mono">{entry.reps}</span>
                        <span className="mono">{entry.weight_kg}</span>
                        <span className="history-rpe-col mono">{entry.rpe ?? '—'}</span>
                        <span style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-small" onClick={() => startEdit(entry)}>
                            ✎
                          </button>
                          <button className="btn btn-small btn-rust" onClick={() => deleteEntry(entry.id)}>
                            ✕
                          </button>
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
