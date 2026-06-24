import { INSTRUMENTS, type Instrument } from "../lib/instruments";
import { SheetSelect } from "../ui/SheetSelect";

interface Props {
  instrument: Instrument;
  onChange: (i: Instrument) => void;
}

export function InstrumentSelector({ instrument, onChange }: Props) {
  return (
    <SheetSelect
      title="Instrument"
      items={INSTRUMENTS}
      selectedId={instrument.id}
      getId={(i) => i.id}
      onSelect={onChange}
      trigger={<span class="instrument-name">{instrument.name}</span>}
      renderItem={(i) => <span>{i.name}</span>}
    />
  );
}
