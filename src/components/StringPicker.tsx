import type { Note } from "../lib/notes";
import { StringButton } from "./StringButton";

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
        return (
          <StringButton
            key={i}
            state={isActive && inTune ? "tuned" : isActive ? "active" : "idle"}
            disabled={!interactive}
            onClick={() => interactive && onSelect(i)}
          >
            {note.name}
            <sup>{note.octave}</sup>
          </StringButton>
        );
      })}
    </div>
  );
}
