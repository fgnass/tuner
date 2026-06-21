import { useState } from "preact/hooks";
import { INSTRUMENTS, type Instrument } from "../lib/instruments";

interface Props {
  instrument: Instrument;
  onChange: (i: Instrument) => void;
}

export function InstrumentSelector({ instrument, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div class="instrument">
      <button type="button" class="instrument-trigger" onClick={() => setOpen(true)}>
        <span class="instrument-name">{instrument.name}</span>
        <span class="chevron">›</span>
      </button>

      {open && (
        <div class="sheet-backdrop" onClick={() => setOpen(false)}>
          <div class="sheet" onClick={(e) => e.stopPropagation()}>
            <div class="sheet-title">Instrument</div>
            {INSTRUMENTS.map((i) => (
              <button
                type="button"
                key={i.id}
                class={i.id === instrument.id ? "sheet-item active" : "sheet-item"}
                onClick={() => {
                  onChange(i);
                  setOpen(false);
                }}
              >
                <span>{i.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
