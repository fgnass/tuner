/**
 * Instrument catalogue. Each instrument carries a set of named tunings (string
 * presets) and a detection range that bounds the pitch search — narrowing the
 * range to an instrument's real fundamentals is the cheapest way to harden
 * octave decisions (a bass can't sound a 600 Hz fundamental, a ukulele can't
 * sound a 50 Hz one).
 *
 * The "Chromatic" instrument has no strings: it matches against the full
 * chromatic scale, for free-pitch tuning of anything.
 */
import type { Tuning } from "./notes.ts";

export interface Instrument {
  id: string;
  name: string;
  /** If true there are no fixed strings; match the full chromatic scale. */
  chromatic?: boolean;
  /** String presets, low → high. Empty for chromatic. */
  tunings: Tuning[];
  /** Pitch-search bounds in Hz, used to seed the detector. */
  range: { min: number; max: number };
}

const guitarTunings: Tuning[] = [
  {
    id: "standard",
    name: "Standard",
    strings: ["E2", "A2", "D3", "G3", "B3", "E4"],
  },
  {
    id: "drop-d",
    name: "Drop D",
    strings: ["D2", "A2", "D3", "G3", "B3", "E4"],
  },
  {
    id: "double-drop-d",
    name: "Double Drop D",
    strings: ["D2", "A2", "D3", "G3", "B3", "D4"],
  },
  {
    id: "half-step-down",
    name: "Half-step Down (E♭)",
    strings: ["D#2", "G#2", "C#3", "F#3", "A#3", "D#4"],
  },
  {
    id: "drop-c",
    name: "Drop C",
    strings: ["C2", "G2", "C3", "F3", "A3", "D4"],
  },
  {
    id: "dadgad",
    name: "DADGAD",
    strings: ["D2", "A2", "D3", "G3", "A3", "D4"],
  },
  {
    id: "open-g",
    name: "Open G",
    strings: ["D2", "G2", "D3", "G3", "B3", "D4"],
  },
  {
    id: "open-d",
    name: "Open D",
    strings: ["D2", "A2", "D3", "F#3", "A3", "D4"],
  },
];

const bassTunings: Tuning[] = [
  {
    id: "bass-standard",
    name: "Standard (4)",
    strings: ["E1", "A1", "D2", "G2"],
  },
  { id: "bass-drop-d", name: "Drop D (4)", strings: ["D1", "A1", "D2", "G2"] },
  { id: "bass-5", name: "5-string", strings: ["B0", "E1", "A1", "D2", "G2"] },
];

const ukuleleTunings: Tuning[] = [
  {
    id: "uke-standard",
    name: "Standard (high G)",
    strings: ["G4", "C4", "E4", "A4"],
  },
  { id: "uke-low-g", name: "Low G", strings: ["G3", "C4", "E4", "A4"] },
  { id: "uke-baritone", name: "Baritone", strings: ["D3", "G3", "B3", "E4"] },
];

export const INSTRUMENTS: Instrument[] = [
  {
    id: "guitar",
    name: "Guitar",
    tunings: guitarTunings,
    range: { min: 55, max: 700 },
  },
  {
    id: "bass",
    name: "Bass",
    tunings: bassTunings,
    range: { min: 28, max: 450 },
  },
  {
    id: "ukulele",
    name: "Ukulele",
    tunings: ukuleleTunings,
    range: { min: 130, max: 900 },
  },
  {
    id: "chromatic",
    name: "Chromatic",
    chromatic: true,
    tunings: [],
    range: { min: 28, max: 2000 },
  },
];

export const DEFAULT_INSTRUMENT = INSTRUMENTS[0];
