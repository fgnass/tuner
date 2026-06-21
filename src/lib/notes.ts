export const A4 = 440;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** A musical note expressed as a frequency plus a human-readable label. */
export interface Note {
  /** Semitone distance from A4 (A4 = 0, C4 = -9, A5 = 12). */
  semitones: number;
  /** e.g. "E", "C#". */
  name: string;
  /** Scientific octave number. */
  octave: number;
  /** Ideal frequency in Hz. */
  freq: number;
}

/** Build a Note from its semitone offset relative to A4. */
export function noteFromSemitones(semitones: number): Note {
  const freq = A4 * 2 ** (semitones / 12);
  // MIDI note number: A4 = 69.
  const midi = 69 + semitones;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { semitones, name, octave, freq };
}

/** Parse scientific pitch notation ("E2", "C#3") into a Note. */
export function noteFromName(label: string): Note {
  const match = /^([A-G]#?)(-?\d+)$/.exec(label.trim());
  if (!match) throw new Error(`Invalid note: ${label}`);
  const [, name, octaveStr] = match;
  const index = NOTE_NAMES.indexOf(name as (typeof NOTE_NAMES)[number]);
  const octave = parseInt(octaveStr, 10);
  const midi = (octave + 1) * 12 + index;
  return noteFromSemitones(midi - 69);
}

/** Cents deviation of a measured frequency from a reference frequency. */
export function centsOff(freq: number, refFreq: number): number {
  return 1200 * Math.log2(freq / refFreq);
}

/** Nearest chromatic note to an arbitrary frequency, plus cents deviation. */
export function nearestNote(freq: number): { note: Note; cents: number } {
  const semitones = Math.round(12 * Math.log2(freq / A4));
  const note = noteFromSemitones(semitones);
  return { note, cents: centsOff(freq, note.freq) };
}

export interface Tuning {
  id: string;
  name: string;
  /** Strings in scientific pitch notation, low to high. */
  strings: string[];
}

/** Resolve a tuning's string labels into Notes (low → high). */
export function tuningNotes(tuning: Tuning): Note[] {
  return tuning.strings.map(noteFromName);
}

/** Cents from a reference, folded into the nearest octave → range (-600, 600]. */
export function octaveFoldedCents(freq: number, refFreq: number): number {
  const c = centsOff(freq, refFreq);
  return c - 1200 * Math.round(c / 1200);
}

/** Extra cents past the half-step boundary before abandoning the current note. */
const KEEP_MARGIN_CENTS = 15;
/** A rival string must beat the current one by this many cents to win. */
const SWITCH_MARGIN_CENTS = 30;

/**
 * Hysteresis target tracker. Picks which note (chromatic) or string
 * (instrument) a frequency belongs to, but
 * resists flipping to a neighbour until the pitch has clearly crossed the
 * boundary between them. Without this the readout flickers whenever you sit
 * exactly between two notes, or between two strings of similar pitch.
 */
export class TargetTracker {
  private currentSemitone: number | null = null;
  private currentIndex = -1;

  reset(): void {
    this.currentSemitone = null;
    this.currentIndex = -1;
  }

  /** Nearest chromatic note to `freq`, sticky within ±(50 + margin) cents. */
  chromatic(freq: number): { note: Note; cents: number } {
    if (this.currentSemitone !== null) {
      const current = noteFromSemitones(this.currentSemitone);
      const cents = centsOff(freq, current.freq);
      if (Math.abs(cents) <= 50 + KEEP_MARGIN_CENTS) return { note: current, cents };
    }
    const nearest = nearestNote(freq);
    this.currentSemitone = nearest.note.semitones;
    return nearest;
  }

  /** Nearest string from a fixed set, sticky unless another wins by a margin. */
  string(freq: number, notes: Note[]): { index: number; cents: number } {
    let best = 0;
    let bestAbs = Infinity;
    for (let i = 0; i < notes.length; i++) {
      const a = Math.abs(centsOff(freq, notes[i].freq));
      if (a < bestAbs) {
        bestAbs = a;
        best = i;
      }
    }
    if (this.currentIndex >= 0 && this.currentIndex < notes.length && this.currentIndex !== best) {
      const currentAbs = Math.abs(centsOff(freq, notes[this.currentIndex].freq));
      if (currentAbs - bestAbs < SWITCH_MARGIN_CENTS) best = this.currentIndex;
    }
    this.currentIndex = best;
    return { index: best, cents: centsOff(freq, notes[best].freq) };
  }
}
