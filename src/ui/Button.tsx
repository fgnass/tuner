import { styled } from "classname-variants/preact";

export const Button = styled("button", {
  base: "button",
  variants: {
    intent: {
      primary: "button-primary",
      outline: "button-outline",
      ghost: "button-ghost",
    },
    size: {
      bare: "",
      sm: "button-sm",
      md: "button-md",
      lg: "button-lg",
      icon: "button-icon",
    },
    disabled: {
      true: "button-disabled",
    },
  },
  defaultVariants: {
    intent: "primary",
    size: "md",
  },
  defaultProps: {
    type: "button",
  },
  forwardProps: ["disabled"],
});

export const SwitchTrack = styled("span", {
  base: "switch",
  variants: {
    checked: {
      true: "on",
    },
  },
});
