import { fmtCents, useTunerTrail } from "../hooks/useTunerTrail";
import type { Note } from "../lib/notes";
import { CenterLine, Needle, NoteCircle } from "./TunerDisplay.parts";

interface Props {
  target: Note | null;
  /** Cents deviation from the target, or null when no signal. */
  cents: number | null;
  inTune: boolean;
}

export function TunerDisplay({ target, cents, inTune }: Props) {
  const { canvasRef, needleRef, numRef } = useTunerTrail({ cents, inTune });

  const active = cents !== null;
  const mode = !active ? "idle" : inTune ? "intune" : "off";
  const instruction = inTune ? "" : !active ? "" : cents! > 0 ? "Tune down" : "Tune up";

  return (
    <div class="display">
      <canvas ref={canvasRef} />
      <CenterLine state={inTune ? "lit" : "idle"} />

      <span class="accidental flat">♭</span>
      <span class="accidental sharp">♯</span>

      {inTune && <div class="tune-flash" />}
      {inTune && <div class="bloom" />}

      <Needle ref={needleRef} mode={mode}>
        {mode === "off" ? (
          <span class="needle-num" ref={numRef}>
            {fmtCents(cents!)}
          </span>
        ) : null}
        {instruction && <div class="needle-hint">{instruction}</div>}
        <svg class="needle-nib" viewBox="0 0 42 48" fill="none" aria-hidden="true">
          <path
            fill="currentColor"
            d="M26.405 44c-2.41 2.72-4.25 4-5.63 4s-3.22-1.32-5.63-4C8.615 36.58-.805 20 .055 13a13.06 13.06 0 0 1 6.45-9.87C9.865 1.08 14.395 0 19.585 0h2.37c5.2 0 9.73 1.08 13.09 3.13a13.06 13.06 0 0 1 6.45 9.87c.86 7-8.56 23.58-15.09 31"
          />
        </svg>
      </Needle>

      {target && (
        <NoteCircle state={inTune ? "inTune" : "idle"}>
          {target.name}
          <sup>{target.octave}</sup>
        </NoteCircle>
      )}
    </div>
  );
}
