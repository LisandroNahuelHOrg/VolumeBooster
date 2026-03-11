/**
 * @fileoverview Persistent top-frame toast used to fall back from automatic
 * global mode to the robust manual lane.
 */
import type { AutoFallbackToastCommandPayload } from "../shared/types";
import type {
  AutoFallbackToastInternals,
  AutoFallbackToastOptions
} from "./fallback-toast/auto-fallback-toast-internals";
import { destroyFallbackToast } from "./fallback-toast/destroy-fallback-toast";
import { hideFallbackToast } from "./fallback-toast/hide-fallback-toast";
import { isFallbackToastVisible } from "./fallback-toast/is-fallback-toast-visible";
import { setAutoFallbackToastOptions } from "./fallback-toast/set-auto-fallback-toast-options";
import { showFallbackToast } from "./fallback-toast/show-fallback-toast";

/**
 * Manages the lifecycle of the in-page fallback toast shown in the top frame.
 */
export class AutoFallbackToast implements AutoFallbackToastInternals {
  root: HTMLDivElement | null = null;
  body: HTMLParagraphElement | null = null;
  readonly show: (payload: AutoFallbackToastCommandPayload) => void;
  readonly hide: () => void;
  readonly isVisible: () => boolean;
  readonly destroy: () => void;

  constructor(private readonly options: AutoFallbackToastOptions) {
    setAutoFallbackToastOptions(this, options);
    this.show = showFallbackToast.bind(null, this);
    this.hide = hideFallbackToast.bind(null, this);
    this.isVisible = isFallbackToastVisible.bind(null, this);
    this.destroy = destroyFallbackToast.bind(null, this);
  }
}
