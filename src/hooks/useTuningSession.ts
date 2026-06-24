import { useSignal } from "@preact/signals";
import { useEffect, useMemo, useRef } from "preact/hooks";
import type { Instrument } from "../lib/instruments";
import {
  type Note,
  octaveFoldedCents,
  TargetTracker,
  type Tuning,
  tuningNotes,
} from "../lib/notes";
import type { Reading } from "./usePitch";

const IN_TUNE_ENTER = 3;
const IN_TUNE_LEAVE = 6;

interface UseTuningSessionOptions {
  instrument: Instrument;
  tuning: Tuning;
  reading: Reading;
  auto: boolean;
  manualIndex: number;
}

export function useTuningSession({
  instrument,
  tuning,
  reading,
  auto,
  manualIndex,
}: UseTuningSessionOptions) {
  const notes = useMemo(
    () => (instrument.chromatic ? [] : tuningNotes(tuning)),
    [instrument, tuning],
  );
  const inTuneRef = useRef(false);
  const trackerRef = useRef(new TargetTracker());
  const tunedRef = useRef<Set<number>>(new Set());
  const allTuned = useSignal(false);

  const reset = () => {
    trackerRef.current.reset();
    tunedRef.current = new Set();
    inTuneRef.current = false;
    allTuned.value = false;
  };

  const hasSignal = reading.freq > 0;
  let activeIndex = auto ? -1 : manualIndex;
  let cents: number | null = null;
  let target: Note | null = null;

  if (hasSignal) {
    if (instrument.chromatic) {
      const match = trackerRef.current.chromatic(reading.freq);
      target = match.note;
      cents = match.cents;
    } else if (auto) {
      const match = trackerRef.current.string(reading.freq, notes);
      activeIndex = match.index;
      cents = match.cents;
      target = notes[match.index];
    } else {
      activeIndex = manualIndex;
      cents = octaveFoldedCents(reading.freq, notes[manualIndex].freq);
      target = notes[manualIndex];
    }
  }

  const inTune =
    cents !== null && Math.abs(cents) <= (inTuneRef.current ? IN_TUNE_LEAVE : IN_TUNE_ENTER);
  inTuneRef.current = inTune;

  useEffect(() => {
    if (instrument.chromatic || !inTune || activeIndex < 0 || notes.length === 0) return;
    const tuned = tunedRef.current;
    if (tuned.has(activeIndex)) return;
    tuned.add(activeIndex);
    if (tuned.size >= notes.length) allTuned.value = true;
  }, [inTune, activeIndex, instrument.chromatic, notes.length]);

  return {
    activeIndex,
    allTuned: allTuned.value,
    cents,
    inTune,
    notes,
    reset,
    target,
  };
}
