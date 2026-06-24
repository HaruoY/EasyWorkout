import { useState, useEffect, FormEvent } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Layout from '../components/Layout';
import api from '../api/client';
import { WeightLog, ExerciseProgressPoint } from '../utils/types';

export default function ProgressPage() {
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const [exerciseList, setExerciseList] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseProgressPoint[]>([]);

  useEffect(() => {
    loadWeightLogs();
    loadExerciseList();
  }, []);

  useEffect(() => {
    if (selectedExercise) {
      loadExerciseProgress(selectedExercise);
    }
  }, [selectedExercise]);

  async function loadWeightLogs() {
    const data = await api.post('listWeightLogs');
    setWeightLogs(data.logs);
  }

  async function loadExerciseList() {
    const data = await api.post('listExercises');
    setExerciseList(data.exercises);
    if (data.exercises.length > 0) {
      setSelectedExercise(data.exercises[0]);
    }
  }

  async function loadExerciseProgress(exerciseName: string) {
    const data = await api.post('exerciseProgress', { exerciseName });
    setExerciseHistory(data.history);
  }

  async function handleAddWeight(e: FormEvent) {
    e.preventDefault();
    await api.post('addWeightLog', { logDate: newDate, weightKg: Number(newWeight) });
    setNewWeight('');
    loadWeightLogs();
  }

  const weightChartData = weightLogs.map((log) => ({
    date: new Date(log.log_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    peso: log.weight_kg,
  }));

  const exerciseChartData = exerciseHistory.map((point) => ({
    date: new Date(point.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    carico: point.maxWeight,
  }));

  return (
    <Layout>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Progressi</h1>
      <p style={{ color: 'var(--grey-meta)', marginBottom: 24 }}>
        Storico del peso corporeo e del carico massimo per esercizio.
      </p>

      <div className="card">
        <span className="card-label">Peso corporeo nel tempo</span>
        {weightChartData.length > 0 ? (
          <div style={{ width: '100%', height: 240, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                <XAxis dataKey="date" fontSize={12} stroke="#8b8378" />
                <YAxis fontSize={12} stroke="#8b8378" domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="peso" stroke="#2d5f4c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: 'var(--grey-meta)', fontSize: 14 }}>Nessuna misurazione registrata ancora.</p>
        )}

        <form onSubmit={handleAddWeight} style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label htmlFor="newDate">Data</label>
            <input id="newDate" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label htmlFor="newWeight">Peso (kg)</label>
            <input
              id="newWeight"
              type="number"
              step="0.1"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-sage">
            Registra
          </button>
        </form>
      </div>

      <div className="card">
        <span className="card-label">Progressione carico per esercizio</span>
        {exerciseList.length === 0 ? (
          <p style={{ color: 'var(--grey-meta)', fontSize: 14 }}>
            Registra qualche sessione di allenamento per vedere i grafici di progressione.
          </p>
        ) : (
          <>
            <div className="form-group" style={{ maxWidth: 280, marginTop: 12 }}>
              <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}>
                {exerciseList.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            {exerciseChartData.length > 0 ? (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={exerciseChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                    <XAxis dataKey="date" fontSize={12} stroke="#8b8378" />
                    <YAxis fontSize={12} stroke="#8b8378" domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="carico" stroke="#c75d3a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ color: 'var(--grey-meta)', fontSize: 14 }}>Nessun dato per questo esercizio.</p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
