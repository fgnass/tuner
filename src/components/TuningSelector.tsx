import { useState } from "preact/hooks";
import type { Tuning } from "../lib/notes";

interface Props {
  tuning: Tuning;
  tunings: Tuning[];
  onChange: (t: Tuning) => void;
}

export function TuningSelector({ tuning, tunings, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div class="tuning">
      <button type="button" class="tuning-trigger" onClick={() => setOpen(true)}>
        <span class="tuning-name">{tuning.name}</span>
        <span class="chevron">›</span>
      </button>

      {open && (
        <div class="sheet-backdrop" onClick={() => setOpen(false)}>
          <div class="sheet" onClick={(e) => e.stopPropagation()}>
            <div class="sheet-title">Tuning</div>
            {tunings.map((t) => (
              <button
                type="button"
                key={t.id}
                class={t.id === tuning.id ? "sheet-item active" : "sheet-item"}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
              >
                <span>{t.name}</span>
                <span class="sheet-strings">{t.strings.join(" ").replace(/\d/g, "")}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
