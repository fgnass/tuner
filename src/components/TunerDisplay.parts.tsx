import { styled } from "classname-variants/preact";

export const CenterLine = styled("div", {
  base: "centerline",
  variants: {
    state: {
      idle: "",
      lit: "lit",
    },
  },
  defaultVariants: {
    state: "idle",
  },
});

export const Needle = styled("div", {
  base: "needle",
  variants: {
    mode: {
      idle: "idle",
      intune: "intune",
      off: "off",
    },
  },
  defaultVariants: {
    mode: "idle",
  },
});

export const NoteCircle = styled("div", {
  base: "note-circle",
  variants: {
    state: {
      idle: "",
      inTune: "in-tune",
    },
  },
  defaultVariants: {
    state: "idle",
  },
});
