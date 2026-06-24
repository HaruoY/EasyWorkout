/**
 * Parser euristico "a regole" per schede di allenamento in PDF.
 *
 * Non usa AI: cerca pattern testuali comuni nelle schede di allenamento
 * (es. "Panca piana 4x8-10", "Squat: 3 serie x 12 rip", "Stacco 5 x 5").
 * Il risultato è un punto di partenza da correggere manualmente nel form,
 * non un'estrazione garantita corretta.
 */

export interface ParsedExerciseCandidate {
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  sourceLine: string; // riga originale, utile per il confronto visuale con il PDF
  confidence: 'high' | 'low'; // 'low' = match debole, va controllato con più attenzione
}

// Pattern principali, in ordine di priorità (i più specifici prima)
const PATTERNS: { regex: RegExp; confidence: 'high' | 'low' }[] = [
  // "Panca piana 4x8-10" oppure "Panca piana 4 x 8-10"
  { regex: /^(.+?)\s+(\d{1,2})\s*[xX×]\s*(\d{1,2}(?:[-–]\d{1,2})?)\s*$/, confidence: 'high' },
  // "Panca piana: 4 serie x 8-10 ripetizioni" / "4 serie da 8 a 10 reps"
  { regex: /^(.+?)[:\-]?\s*(\d{1,2})\s*ser(?:ie)?\.?\s*(?:x|da)?\s*(\d{1,2}(?:[-–]\d{1,2})?)/i, confidence: 'high' },
  // "Squat 4 serie 8 ripetizioni" (senza "x" esplicito)
  { regex: /^(.+?)\s+(\d{1,2})\s*ser(?:ie)?\.?\s+(\d{1,2}(?:[-–]\d{1,2})?)\s*rip/i, confidence: 'low' },
  // "Stacco da terra - 5 x 5" con trattino separatore prima del numero
  { regex: /^(.+?)\s*[-–]\s*(\d{1,2})\s*[xX×]\s*(\d{1,2}(?:[-–]\d{1,2})?)\s*$/, confidence: 'high' },
];

// Righe da scartare a priori: intestazioni, numerazioni di pagina, parole generiche
const NOISE_PATTERNS = [
  /^pagina\s+\d+/i,
  /^scheda\s/i,
  /^giorno\s+\d+/i,
  /^settimana\s+\d+/i,
  /^note[:\s]*$/i,
  /^\d+$/,
];

function isNoiseLine(line: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(line.trim()));
}

function cleanExerciseName(raw: string): string {
  return raw
    .replace(/^[\d.\-•*\s]+/, '') // rimuove numerazioni/bullet iniziali (es. "1. ", "- ")
    .replace(/[:\-]\s*$/, '') // rimuove separatori finali residui
    .trim();
}

/** Estrae righe candidate da un blocco di testo grezzo (una pagina o l'intero documento). */
export function parseExercisesFromText(rawText: string): ParsedExerciseCandidate[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !isNoiseLine(l));

  const candidates: ParsedExerciseCandidate[] = [];

  for (const line of lines) {
    for (const { regex, confidence } of PATTERNS) {
      const match = line.match(regex);
      if (match) {
        const name = cleanExerciseName(match[1]);
        const sets = parseInt(match[2], 10);
        const reps = match[3].replace('–', '-');

        if (name.length >= 2 && name.length <= 60 && sets > 0 && sets <= 20) {
          candidates.push({
            exerciseName: name,
            targetSets: sets,
            targetReps: reps,
            sourceLine: line,
            confidence,
          });
        }
        break; // primo pattern che fa match vince, non provare gli altri su questa riga
      }
    }
  }

  return candidates;
}
