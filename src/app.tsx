import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import logoMarkUrl from "./assets/icon.svg?url&no-inline";
import { Header } from "./components/Header";
import { InstallBanner } from "./components/InstallBanner";
import { StringPicker } from "./components/StringPicker";
import { TunerDisplay } from "./components/TunerDisplay";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import { usePitch } from "./hooks/usePitch";
import { useWakeLock } from "./hooks/useWakeLock";
import { DEFAULT_INSTRUMENT, type Instrument } from "./lib/instruments";
import { type Note, octaveFoldedCents, TargetTracker, type Tuning, tuningNotes } from "./lib/notes";

const IN_TUNE_ENTER = 3; // within this many cents counts as perfectly in tune
const IN_TUNE_LEAVE = 6; // must drift past this to drop back out (hysteresis)

const INSTALL_DISMISSED_KEY = "tuner:install-dismissed";

function readInstallDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function App() {
  const [instrument, setInstrument] = useState<Instrument>(DEFAULT_INSTRUMENT);
  const [tuning, setTuning] = useState<Tuning>(DEFAULT_INSTRUMENT.tunings[0]);
  const [auto, setAuto] = useState(true);
  const [manualIndex, setManualIndex] = useState(0);

  const { status, reading, start, stop } = usePitch(instrument.range);
  const install = useInstallPrompt();
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  const notes = useMemo(
    () => (instrument.chromatic ? [] : tuningNotes(tuning)),
    [instrument, tuning],
  );
  const inTuneRef = useRef(false);
  const trackerRef = useRef(new TargetTracker());

  // Track which strings have reached "in tune" this session; once every string
  // has, offer to install the app (a far better moment than the cold start).
  const tunedRef = useRef<Set<number>>(new Set());
  const [allTuned, setAllTuned] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(readInstallDismissed);

  const resetTuningProgress = () => {
    tunedRef.current = new Set();
    setAllTuned(false);
  };

  const dismissInstall = () => {
    setInstallDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch {
      // Private mode / blocked storage — just dismiss for this session.
    }
  };

  const hasSignal = reading.freq > 0;

  useEffect(() => {
    if (status !== "requesting" && status !== "listening") {
      void releaseWakeLock();
    }
  }, [status, releaseWakeLock]);

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

  useEffect(() => {
    if (instrument.chromatic || !inTune || activeIndex < 0 || notes.length === 0) return;
    const tuned = tunedRef.current;
    if (tuned.has(activeIndex)) return;
    tuned.add(activeIndex);
    if (tuned.size >= notes.length) setAllTuned(true);
  }, [inTune, activeIndex, instrument.chromatic, notes.length]);

  const onChangeInstrument = (i: Instrument) => {
    setInstrument(i);
    setTuning(i.tunings[0] ?? tuning);
    setManualIndex(0);
    trackerRef.current.reset();
    resetTuningProgress();
  };

  const onChangeTuning = (t: Tuning) => {
    setTuning(t);
    if (manualIndex >= t.strings.length) setManualIndex(0);
    trackerRef.current.reset();
    resetTuningProgress();
  };

  const startTuning = () => {
    void requestWakeLock();
    void start();
  };

  const stopTuning = () => {
    void releaseWakeLock();
    stop();
  };

  if (status !== "listening") {
    return (
      <main class="app start">
        <div class="start-content">
          <img class="logo-mark" src={logoMarkUrl} width="160" height="160" alt="Tuner" />
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
                onClick={startTuning}
              >
                {status === "requesting" ? "Starting…" : "Start tuning"}
              </button>
              {install.canInstall && (
                <button type="button" class="install-btn" onClick={install.promptInstall}>
                  Install app
                </button>
              )}
              {!install.canInstall && install.isIOS && !install.isStandalone && (
                <p class="install-hint">
                  Install: tap the Share button, then “Add to Home Screen”.
                </p>
              )}
            </>
          )}
        </div>
        <a
          class="feedback-link"
          href="https://github.com/fgnass/tuner/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
          Feedback &amp; source on GitHub
        </a>
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
        onStop={stopTuning}
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
      {allTuned &&
        !install.isStandalone &&
        !installDismissed &&
        (install.canInstall || install.isIOS) && (
          <InstallBanner
            isIOS={install.isIOS}
            canInstall={install.canInstall}
            onInstall={install.promptInstall}
            onDismiss={dismissInstall}
          />
        )}
    </main>
  );
}
