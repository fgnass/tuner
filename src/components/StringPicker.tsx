import type { Note } from "../lib/notes";

interface Props {
  notes: Note[];
  /** Index of the string currently being tuned/detected, or -1. */
  activeIndex: number;
  /** Whether tapping a string selects it (manual mode). */
  interactive: boolean;
  inTune: boolean;
  onSelect: (index: number) => void;
}

export function StringPicker({ notes, activeIndex, interactive, inTune, onSelect }: Props) {
  return (
    <div class="strings">
      {notes.map((note, i) => {
        const isActive = i === activeIndex;
        const cls = ["string-btn", isActive ? "active" : "", isActive && inTune ? "in-tune" : ""]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            type="button"
            key={i}
            class={cls}
            disabled={!interactive}
            onClick={() => interactive && onSelect(i)}
          >
            {note.name}
            <sup>{note.octave}</sup>
          </button>
        );
      })}
    </div>
  );
}
