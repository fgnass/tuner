import { describe, expect, it } from "vitest";
import {
  A4,
  centsOff,
  nearestNote,
  noteFromName,
  noteFromSemitones,
  octaveFoldedCents,
  TargetTracker,
} from "./notes.ts";

describe("noteFromSemitones", () => {
  it("places A4 at 440 Hz, semitone 0", () => {
    const a4 = noteFromSemitones(0);
    expect(a4).toMatchObject({ name: "A", octave: 4 });
    expect(a4.freq).toBeCloseTo(A4, 6);
  });

  it("derives standard reference pitches", () => {
    expect(noteFromSemitones(-9)).toMatchObject({ name: "C", octave: 4 }); // middle C
    expect(noteFromSemitones(3)).toMatchObject({ name: "C", octave: 5 });
    expect(noteFromSemitones(12).freq).toBeCloseTo(880, 6); // A5
    expect(noteFromSemitones(-48)).toMatchObject({ name: "A", octave: 0 });
  });
});

describe("noteFromName", () => {
  it("round-trips with noteFromSemitones", () => {
    for (const label of ["E2", "A2", "D3", "G3", "B3", "E4", "C#3", "D#4", "B0", "E1"]) {
      const note = noteFromName(label);
      expect(`${note.name}${note.octave}`).toBe(label);
      expect(noteFromSemitones(note.semitones).freq).toBeCloseTo(note.freq, 6);
    }
  });

  it("matches known frequencies", () => {
    expect(noteFromName("E2").freq).toBeCloseTo(82.4069, 3);
    expect(noteFromName("E4").freq).toBeCloseTo(329.6276, 3);
    expect(noteFromName("E1").freq).toBeCloseTo(41.2034, 3);
  });

  it("rejects garbage", () => {
    expect(() => noteFromName("H2")).toThrow();
    expect(() => noteFromName("E")).toThrow();
    expect(() => noteFromName("")).toThrow();
  });
});

describe("centsOff", () => {
  it("is zero at the reference and ±100 a semitone away", () => {
    expect(centsOff(440, 440)).toBeCloseTo(0, 9);
    expect(centsOff(noteFromName("A#4").freq, 440)).toBeCloseTo(100, 6);
    expect(centsOff(noteFromName("G#4").freq, 440)).toBeCloseTo(-100, 6);
  });
});

describe("nearestNote", () => {
  it("snaps a slightly sharp A4 to A4 with a positive cents reading", () => {
    const { note, cents } = nearestNote(443);
    expect(note).toMatchObject({ name: "A", octave: 4 });
    expect(cents).toBeGreaterThan(0);
    expect(cents).toBeLessThan(50);
  });
});

describe("octaveFoldedCents", () => {
  it("folds an octave away back to ~0", () => {
    expect(octaveFoldedCents(880, 440)).toBeCloseTo(0, 6);
    expect(Math.abs(octaveFoldedCents(660, 440))).toBeLessThanOrEqual(600);
  });
});

describe("TargetTracker.chromatic hysteresis", () => {
  it("holds the current note until the pitch clearly crosses the boundary", () => {
    const t = new TargetTracker();
    // Lock onto A4.
    expect(t.chromatic(440).note.name).toBe("A");
    // Just past the half-step boundary toward A#4 — hysteresis keeps it on A4.
    const justOver = noteFromName("A4").freq * 2 ** (60 / 1200); // +60 cents
    expect(t.chromatic(justOver).note.name).toBe("A");
    // Well over — it switches.
    const wellOver = noteFromName("A4").freq * 2 ** (90 / 1200); // +90 cents
    expect(t.chromatic(wellOver).note.name).toBe("A#");
  });
});

describe("TargetTracker.string hysteresis", () => {
  const notes = ["E2", "A2", "D3", "G3", "B3", "E4"].map(noteFromName);

  it("picks the nearest string and resists flipping to a rival", () => {
    const t = new TargetTracker();
    expect(t.string(noteFromName("A2").freq, notes).index).toBe(1);
    // Drift a little toward D3 but not past the switch margin — stays on A2.
    const drift = noteFromName("A2").freq * 2 ** (200 / 1200);
    expect(t.string(drift, notes).index).toBe(1);
  });
});
