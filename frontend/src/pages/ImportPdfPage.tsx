import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/client';
import { extractTextFromPdf, renderPdfPageToCanvas, getPdfPageCount } from '../utils/pdfReader';
import { parseExercisesFromText, ParsedExerciseCandidate } from '../utils/pdfExerciseParser';

interface ExerciseRow extends ParsedExerciseCandidate {
  included: boolean;
}

const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export default function ImportPdfPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [planName, setPlanName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (file && canvasRef.current) {
      renderPdfPageToCanvas(file, currentPage, canvasRef.current).catch(() =>
        setError('Impossibile visualizzare questa pagina del PDF.')
      );
    }
  }, [file, currentPage]);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      setError('Seleziona un file PDF.');
      return;
    }

    setError('');
    setLoading(true);
    setFile(selected);
    setPlanName(selected.name.replace(/\.pdf$/i, ''));

    try {
      const count = await getPdfPageCount(selected);
      setPageCount(count);
      setCurrentPage(1);

      const pages = await extractTextFromPdf(selected);
      const allText = pages.map((p) => p.text).join('\n');
      const candidates = parseExercisesFromText(allText);

      setRows(candidates.map((c) => ({ ...c, included: true })));

      if (candidates.length === 0) {
        setError(
          'Non ho trovato righe nel formato "Esercizio Nx N rip." in questo PDF. Puoi comunque aggiungere gli esercizi a mano confrontandoli con l\'anteprima a sinistra.'
        );
      }
    } catch (err) {
      setError('Impossibile leggere questo PDF. Potrebbe essere protetto o danneggiato.');
    } finally {
      setLoading(false);
    }
  }

  function updateRow(index: number, field: keyof ExerciseRow, value: string | number | boolean) {
    const updated = [...rows];
    (updated[index] as any)[field] = value;
    setRows(updated);
  }

  function addEmptyRow() {
    setRows([
      ...rows,
      { exerciseName: '', targetSets: 3, targetReps: '8-12', sourceLine: '', confidence: 'low', included: true },
    ]);
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const validExercises = rows
      .filter((r) => r.included && r.exerciseName.trim() !== '')
      .map((r) => ({
        exerciseName: r.exerciseName.trim(),
        targetSets: r.targetSets,
        targetReps: r.targetReps,
      }));

    if (validExercises.length === 0) {
      setError('Seleziona almeno un esercizio valido prima di salvare.');
      return;
    }
    if (!planName.trim()) {
      setError('Inserisci un nome per la scheda.');
      return;
    }

    setSaving(true);
    try {
      await api.post('createPlan', {
        name: planName.trim(),
        dayOfWeek: dayOfWeek !== '' ? Number(dayOfWeek) : undefined,
        exercises: validExercises,
      });
      navigate('/plans');
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio della scheda.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Importa scheda da PDF</h1>
      <p style={{ color: 'var(--grey-meta)', marginBottom: 24 }}>
        Carica il PDF, controlla gli esercizi proposti a destra e correggili prima di salvare.
      </p>

      {!file && (
        <div className="card">
          <span className="card-label">Seleziona file</span>
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
          {loading && <p style={{ color: 'var(--grey-meta)', marginTop: 12 }}>Lettura del PDF in corso…</p>}
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {file && (
        <div className="pdf-import-grid">
          {/* Colonna sinistra: anteprima PDF */}
          <div className="card">
            <span className="card-label">Anteprima — {file.name}</span>
            <div
              style={{
                border: '1px solid var(--grid-line)',
                overflow: 'auto',
                maxHeight: 560,
                background: '#fff',
              }}
            >
              <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
            </div>
            {pageCount > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <button
                  className="btn btn-small"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  ← Precedente
                </button>
                <span className="mono" style={{ fontSize: 13, color: 'var(--grey-meta)' }}>
                  Pagina {currentPage} / {pageCount}
                </span>
                <button
                  className="btn btn-small"
                  disabled={currentPage >= pageCount}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Successiva →
                </button>
              </div>
            )}
            <button
              className="btn btn-small"
              style={{ marginTop: 12 }}
              onClick={() => {
                setFile(null);
                setRows([]);
                setError('');
              }}
            >
              Cambia file
            </button>
          </div>

          {/* Colonna destra: form correggibile */}
          <div className="card">
            <span className="card-label">Dati scheda</span>
            <div className="form-row">
              <div className="form-group">
                <label>Nome scheda</label>
                <input value={planName} onChange={(e) => setPlanName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Giorno della settimana (opzionale)</label>
                <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                  <option value="">Nessuno</option>
                  {DAY_NAMES.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <span className="card-label" style={{ marginTop: 16 }}>
              Esercizi rilevati — controlla e correggi
            </span>
            <p style={{ fontSize: 12, color: 'var(--grey-meta)', marginBottom: 8 }}>
              Deseleziona le righe scorrette, modifica i campi, o aggiungine di nuove a mano.
            </p>

            {rows.map((row, idx) => (
              <div
                key={idx}
                className="exercise-row-checkbox"
                style={{ opacity: row.included ? 1 : 0.4 }}
              >
                <input
                  type="checkbox"
                  checked={row.included}
                  onChange={(e) => updateRow(idx, 'included', e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <input
                  value={row.exerciseName}
                  onChange={(e) => updateRow(idx, 'exerciseName', e.target.value)}
                  placeholder="Nome esercizio"
                />
                <input
                  type="number"
                  value={row.targetSets}
                  onChange={(e) => updateRow(idx, 'targetSets', Number(e.target.value))}
                  placeholder="Serie"
                />
                <input
                  value={row.targetReps}
                  onChange={(e) => updateRow(idx, 'targetReps', e.target.value)}
                  placeholder="Rip."
                />
                <button className="btn btn-rust btn-small" onClick={() => removeRow(idx)}>
                  ✕
                </button>
              </div>
            ))}

            <button className="btn btn-small" onClick={addEmptyRow} style={{ marginTop: 12 }}>
              + Aggiungi esercizio manualmente
            </button>

            <div style={{ marginTop: 24 }}>
              <button className="btn btn-sage" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvataggio…' : 'Salva come nuova scheda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
