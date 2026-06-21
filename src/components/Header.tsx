import type { Instrument } from "../lib/instruments";
import type { Tuning } from "../lib/notes";
import { InstrumentSelector } from "./InstrumentSelector";
import { TuningSelector } from "./TuningSelector";

interface Props {
  instrument: Instrument;
  onChangeInstrument: (i: Instrument) => void;
  tuning: Tuning;
  onChangeTuning: (t: Tuning) => void;
  auto: boolean;
  onToggleAuto: () => void;
  /** Release the microphone and return to the start screen. */
  onStop: () => void;
}

export function Header({
  instrument,
  onChangeInstrument,
  tuning,
  onChangeTuning,
  auto,
  onToggleAuto,
  onStop,
}: Props) {
  return (
    <header class="header">
      <div class="header-selectors">
        <InstrumentSelector instrument={instrument} onChange={onChangeInstrument} />
        {!instrument.chromatic && instrument.tunings.length > 1 && (
          <TuningSelector tuning={tuning} tunings={instrument.tunings} onChange={onChangeTuning} />
        )}
      </div>
      <div class="header-actions">
        {!instrument.chromatic && (
          <button
            type="button"
            class="auto-toggle"
            role="switch"
            aria-checked={auto}
            aria-label="Auto string detection"
            onClick={onToggleAuto}
          >
            <span class="auto-label">AUTO</span>
            <span class={auto ? "switch on" : "switch"}>
              <span class="knob" />
            </span>
          </button>
        )}
        <button type="button" class="stop-btn" aria-label="Stop tuning" onClick={onStop}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
}
