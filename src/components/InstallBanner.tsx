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
      <button type="button" class="install-banner-close" aria-label="Dismiss" onClick={onDismiss}>
        ×
      </button>
      <div class="install-banner-body">
        <span class="install-banner-title">All tuned 🎸</span>
        <span class="install-banner-text">
          {isIOS
            ? "Add Tuner to your home screen: tap Share, then “Add to Home Screen”."
            : "Add Tuner to your home screen for one-tap tuning."}
        </span>
      </div>
      {canInstall && (
        <button type="button" class="install-banner-btn" onClick={onInstall}>
          Install
        </button>
      )}
    </div>
  );
}
