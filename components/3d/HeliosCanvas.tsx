"use client";

import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type { HeliosRendererFailureReason } from "@/features/visual-computing/renderer-policy";
import { useHeliosRendererPolicy } from "./useHeliosRendererPolicy";
import type { HeliosCameraConfiguration } from "./types";

const MAX_EXPLICIT_RENDERER_RETRIES = 1;
const LazyHeliosCanvasRenderer = lazy(
  () => import("./HeliosCanvasRenderer"),
);
const LazyHeliosCanvasRendererRetry = lazy(
  () => import("./HeliosCanvasRenderer"),
);

interface RendererBoundaryProps {
  readonly children: ReactNode;
  readonly onError: () => void;
}

class RendererBoundary extends Component<
  RendererBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface HeliosCanvasProps {
  readonly children: ReactNode;
  readonly fallback: ReactNode;
  readonly accessibleLabel: string;
  readonly camera?: HeliosCameraConfiguration;
  readonly className?: string;
}

export function HeliosCanvas({
  children,
  fallback,
  accessibleLabel,
  camera,
  className = "",
}: HeliosCanvasProps) {
  const [rendererFailure, setRendererFailure] =
    useState<HeliosRendererFailureReason | null>(null);
  const [rendererFrameReady, setRendererFrameReady] = useState(false);
  const [rendererAttempt, setRendererAttempt] = useState(0);
  const [rendererRetryCount, setRendererRetryCount] = useState(0);
  const policy = useHeliosRendererPolicy(rendererFailure);
  const ActiveHeliosCanvasRenderer =
    rendererAttempt === 0
      ? LazyHeliosCanvasRenderer
      : LazyHeliosCanvasRendererRetry;

  const reportRendererFailure = useCallback(
    (reason: HeliosRendererFailureReason) => {
      setRendererFrameReady(false);
      setRendererFailure(reason);
    },
    [],
  );
  const reportRendererReady = useCallback(() => {
    setRendererFrameReady(true);
    setRendererRetryCount(0);
  }, []);
  const reportContextLost = useCallback(() => {
    reportRendererFailure("context-lost");
  }, [reportRendererFailure]);
  const retryRenderer = useCallback(() => {
    if (
      rendererFailure === null
      || rendererRetryCount >= MAX_EXPLICIT_RENDERER_RETRIES
    ) {
      return;
    }
    setRendererFrameReady(false);
    setRendererFailure(null);
    setRendererRetryCount((count) => count + 1);
    setRendererAttempt((attempt) => attempt + 1);
  }, [rendererFailure, rendererRetryCount]);
  const resetReadinessOnSurfaceUnmount = useCallback(
    (surface: HTMLDivElement | null) => {
      if (!surface) {
        setRendererFrameReady(false);
      }
    },
    [],
  );

  const rendererReady =
    policy.mode === "webgl" && rendererFrameReady;
  const fallbackActive = !rendererReady;
  const activeRendererFailure =
    policy.reason === "context-lost"
    || policy.reason === "renderer-failed"
      ? policy.reason
      : null;
  const canRetry =
    activeRendererFailure !== null
    && rendererRetryCount < MAX_EXPLICIT_RENDERER_RETRIES;

  return (
    <section
      className={`helios-canvas ${className}`.trim()}
      aria-label={accessibleLabel}
      data-renderer-mode={policy.mode}
      data-renderer-reason={policy.reason}
      data-quality-tier={policy.qualityTier}
      data-renderer-ready={rendererReady ? "true" : "false"}
      data-fallback-active={fallbackActive ? "true" : "false"}
    >
      {fallbackActive && (
        <div className="helios-canvas-fallback" data-helios-fallback>
          {fallback}
          {activeRendererFailure && (
            <div
              className="helios-canvas-recovery"
              data-renderer-recovery={activeRendererFailure}
              aria-live="polite"
            >
              <p>
                {activeRendererFailure === "context-lost"
                  ? "The WebGL 2 context was lost."
                  : "The 3D renderer could not start."}{" "}
                The scientific HTML view remains available.
              </p>
              {canRetry ? (
                <button
                  type="button"
                  data-renderer-retry
                  onClick={retryRenderer}
                >
                  Retry 3D renderer
                </button>
              ) : (
                <p>3D renderer retry unavailable.</p>
              )}
            </div>
          )}
        </div>
      )}
      {policy.mode === "webgl" && (
        <div
          ref={resetReadinessOnSurfaceUnmount}
          className="helios-canvas-surface"
          aria-hidden="true"
        >
          <RendererBoundary
            key={rendererAttempt}
            onError={() => reportRendererFailure("renderer-failed")}
          >
            <Suspense fallback={null}>
              <ActiveHeliosCanvasRenderer
                policy={policy}
                camera={camera}
                onContextLost={reportContextLost}
                onReady={reportRendererReady}
              >
                {children}
              </ActiveHeliosCanvasRenderer>
            </Suspense>
          </RendererBoundary>
        </div>
      )}
    </section>
  );
}
