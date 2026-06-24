import { styled } from "classname-variants/preact";

export const StringButton = styled("button", {
  base: "string-btn",
  variants: {
    state: {
      idle: "",
      active: "active",
      tuned: "active in-tune",
    },
  },
  defaultVariants: {
    state: "idle",
  },
  defaultProps: {
    type: "button",
  },
});
