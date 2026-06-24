import { styled } from "classname-variants/preact";
import { Button } from "../ui/Button";

const InstallDismissButton = styled(Button, {
  base: "button-close",
  defaultProps: {
    intent: "ghost",
    size: "bare",
    type: "button",
  },
});

interface Props {
  /** iOS has no programmatic prompt — show the manual instruction instead. */
  isIOS: boolean;
  /** A deferred install prompt is available (Android / desktop Chromium). */
  canInstall: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

/**
 * Slides in once every string has been tuned — a natural, earned moment to
 * offer installing the app rather than nagging on first load.
 */
export function InstallBanner({ isIOS, canInstall, onInstall, onDismiss }: Props) {
  return (
    <div class="install-banner" role="dialog" aria-label="Install Tuner">
      <InstallDismissButton aria-label="Dismiss" onClick={onDismiss}>
        ×
      </InstallDismissButton>
      <div class="install-banner-body">
        <span class="install-banner-title">All tuned 🎸</span>
        <span class="install-banner-text">
          {isIOS
            ? "Add Tuner to your home screen: tap Share, then “Add to Home Screen”."
            : "Add Tuner to your home screen for one-tap tuning."}
        </span>
      </div>
      {canInstall && (
        <Button intent="primary" size="sm" onClick={onInstall}>
          Install
        </Button>
      )}
    </div>
  );
}
