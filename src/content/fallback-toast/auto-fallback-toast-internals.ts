export interface AutoFallbackToastOptions {
  onManualFallback: () => void;
  onDismiss: () => void;
}

export interface AutoFallbackToastInternals {
  root: HTMLDivElement | null;
  body: HTMLParagraphElement | null;
}
