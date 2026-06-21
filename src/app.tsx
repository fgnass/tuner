import { useMemo, useRef, useState } from "preact/hooks";
import { Header } from "./components/Header";
import { StringPicker } from "./components/StringPicker";
import { TunerDisplay } from "./components/TunerDisplay";
import { usePitch } from "./hooks/usePitch";
import { DEFAULT_INSTRUMENT, type Instrument } from "./lib/instruments";
import { type Note, octaveFoldedCents, TargetTracker, type Tuning, tuningNotes } from "./lib/notes";

const IN_TUNE_ENTER = 3; // within this many cents counts as perfectly in tune
const IN_TUNE_LEAVE = 6; // must drift past this to drop back out (hysteresis)

export function App() {
  const [instrument, setInstrument] = useState<Instrument>(DEFAULT_INSTRUMENT);
  const [tuning, setTuning] = useState<Tuning>(DEFAULT_INSTRUMENT.tunings[0]);
  const [auto, setAuto] = useState(true);
  const [manualIndex, setManualIndex] = useState(0);

  const { status, reading, start, stop } = usePitch(instrument.range);

  const notes = useMemo(
    () => (instrument.chromatic ? [] : tuningNotes(tuning)),
    [instrument, tuning],
  );
  const inTuneRef = useRef(false);
  const trackerRef = useRef(new TargetTracker());

  const hasSignal = reading.freq > 0;

  let activeIndex = auto ? -1 : manualIndex;
  let cents: number | null = null;
  let target: Note | null = null;

  if (hasSignal) {
    if (instrument.chromatic) {
      const m = trackerRef.current.chromatic(reading.freq);
      target = m.note;
      cents = m.cents;
    } else if (auto) {
      const m = trackerRef.current.string(reading.freq, notes);
      activeIndex = m.index;
      cents = m.cents;
      target = notes[m.index];
    } else {
      activeIndex = manualIndex;
      cents = octaveFoldedCents(reading.freq, notes[manualIndex].freq);
      target = notes[manualIndex];
    }
  }

  const inTune =
    cents !== null && Math.abs(cents) <= (inTuneRef.current ? IN_TUNE_LEAVE : IN_TUNE_ENTER);
  inTuneRef.current = inTune;

  const onChangeInstrument = (i: Instrument) => {
    setInstrument(i);
    setTuning(i.tunings[0] ?? tuning);
    setManualIndex(0);
    trackerRef.current.reset();
  };

  const onChangeTuning = (t: Tuning) => {
    setTuning(t);
    if (manualIndex >= t.strings.length) setManualIndex(0);
    trackerRef.current.reset();
  };

  if (status !== "listening") {
    return (
      <main class="app start">
        <img class="logo-mark" src="/icon.svg" width="160" height="160" alt="Tuner" />
        {status === "denied" ? (
          <p class="hint">
            Microphone access was blocked. Enable it in your browser settings, then reload.
          </p>
        ) : status === "error" ? (
          <p class="hint">Couldn't access the microphone on this device.</p>
        ) : (
          <>
            <p class="hint">A free, full-screen instrument tuner. Needs your microphone.</p>
            <button
              type="button"
              class="start-btn"
              disabled={status === "requesting"}
              onClick={start}
            >
              {status === "requesting" ? "Starting…" : "Start tuning"}
            </button>
          </>
        )}
      </main>
    );
  }

  return (
    <main class="app">
      <Header
        instrument={instrument}
        onChangeInstrument={onChangeInstrument}
        tuning={tuning}
        onChangeTuning={onChangeTuning}
        auto={auto}
        onToggleAuto={() => {
          setAuto((a) => !a);
          trackerRef.current.reset();
        }}
        onStop={stop}
      />
      <TunerDisplay target={target} cents={cents} inTune={inTune} />
      {!instrument.chromatic && (
        <StringPicker
          notes={notes}
          activeIndex={activeIndex}
          interactive={!auto}
          inTune={inTune}
          onSelect={setManualIndex}
        />
      )}
    </main>
  );
}
