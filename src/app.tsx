import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import logoMarkUrl from "./assets/icon.svg?url&no-inline";
import { Header } from "./components/Header";
import { InstallBanner } from "./components/InstallBanner";
import { StringPicker } from "./components/StringPicker";
import { TunerDisplay } from "./components/TunerDisplay";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import { usePitch } from "./hooks/usePitch";
import { useTuningSession } from "./hooks/useTuningSession";
import { useWakeLock } from "./hooks/useWakeLock";
import { DEFAULT_INSTRUMENT, type Instrument } from "./lib/instruments";
import type { Tuning } from "./lib/notes";
import { Button } from "./ui/Button";

const INSTALL_DISMISSED_KEY = "tuner:install-dismissed";

function readInstallDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function App() {
  const instrument = useSignal<Instrument>(DEFAULT_INSTRUMENT);
  const tuning = useSignal<Tuning>(DEFAULT_INSTRUMENT.tunings[0]);
  const auto = useSignal(true);
  const manualIndex = useSignal(0);

  const { status, reading, start, stop } = usePitch(instrument.value.range);
  const install = useInstallPrompt();
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
  const installDismissed = useSignal(readInstallDismissed());
  const session = useTuningSession({
    instrument: instrument.value,
    tuning: tuning.value,
    reading,
    auto: auto.value,
    manualIndex: manualIndex.value,
  });

  const dismissInstall = () => {
    installDismissed.value = true;
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch {
      // Private mode / blocked storage — just dismiss for this session.
    }
  };

  useEffect(() => {
    if (status !== "requesting" && status !== "listening") {
      void releaseWakeLock();
    }
  }, [status, releaseWakeLock]);

  const onChangeInstrument = (i: Instrument) => {
    instrument.value = i;
    tuning.value = i.tunings[0] ?? tuning.value;
    manualIndex.value = 0;
    session.reset();
  };

  const onChangeTuning = (t: Tuning) => {
    tuning.value = t;
    if (manualIndex.value >= t.strings.length) manualIndex.value = 0;
    session.reset();
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
              <Button
                intent="primary"
                size="lg"
                disabled={status === "requesting"}
                onClick={startTuning}
              >
                {status === "requesting" ? "Starting…" : "Start tuning"}
              </Button>
              {install.canInstall && (
                <Button intent="outline" size="md" onClick={install.promptInstall}>
                  Install app
                </Button>
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
        instrument={instrument.value}
        onChangeInstrument={onChangeInstrument}
        tuning={tuning.value}
        onChangeTuning={onChangeTuning}
        auto={auto.value}
        onToggleAuto={() => {
          auto.value = !auto.value;
          session.reset();
        }}
        onStop={stopTuning}
      />
      <TunerDisplay target={session.target} cents={session.cents} inTune={session.inTune} />
      {!instrument.value.chromatic && (
        <StringPicker
          notes={session.notes}
          activeIndex={session.activeIndex}
          interactive={!auto.value}
          inTune={session.inTune}
          onSelect={(index) => {
            manualIndex.value = index;
          }}
        />
      )}
      {session.allTuned &&
        !install.isStandalone &&
        !installDismissed.value &&
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
