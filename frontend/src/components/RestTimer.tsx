import { useEffect, useRef, useState } from 'react';

interface RestTimerProps {
  durationSeconds: number;
  onClose: () => void;
  /** Cambia per far ripartire il timer da capo (es. ad ogni nuova serie registrata) */
  resetKey: number;
}

/** Riproduce un breve beep con la Web Audio API, senza bisogno di file audio esterni. */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Web Audio non disponibile: fallback silenzioso, il timer resta comunque visibile
  }
}

export default function RestTimer({ durationSeconds, onClose, resetKey }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setSecondsLeft(durationSeconds);
    setDone(false);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setDone(true);
          playBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, durationSeconds]);

  function addSeconds(delta: number) {
    setSecondsLeft((prev) => Math.max(0, prev + delta));
    setDone(false);
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className={`rest-timer${done ? ' done' : ''}`}>
      <button onClick={() => addSeconds(-15)} aria-label="Togli 15 secondi">
        −15
      </button>
      <span className="rest-timer-value">{display}</span>
      <button onClick={() => addSeconds(15)} aria-label="Aggiungi 15 secondi">
        +15
      </button>
      <button onClick={onClose} aria-label="Chiudi timer" style={{ marginLeft: 4 }}>
        ✕
      </button>
    </div>
  );
}
