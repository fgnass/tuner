import type { Tuning } from "../lib/notes";
import { SheetSelect } from "../ui/SheetSelect";

interface Props {
  tuning: Tuning;
  tunings: Tuning[];
  onChange: (t: Tuning) => void;
}

export function TuningSelector({ tuning, tunings, onChange }: Props) {
  return (
    <SheetSelect
      title="Tuning"
      items={tunings}
      selectedId={tuning.id}
      getId={(t) => t.id}
      onSelect={onChange}
      trigger={<span class="tuning-name">{tuning.name}</span>}
      renderItem={(t) => (
        <>
          <span>{t.name}</span>
          <span class="sheet-strings">{t.strings.join(" ").replace(/\d/g, "")}</span>
        </>
      )}
    />
  );
}
