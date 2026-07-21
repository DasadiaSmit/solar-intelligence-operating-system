"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Solar Intelligence OS render failure", error);
  }, [error]);

  return (
    <main className="system-state system-state-error" role="alert">
      <span>SI·OS / RECOVERABLE FAULT</span>
      <h1>The analytical workspace could not be assembled</h1>
      <p>No production claim has been emitted. Retry the deterministic snapshot, then inspect the health endpoint if the fault persists.</p>
      {error.digest && <code>TRACE {error.digest}</code>}
      <button onClick={reset}>RETRY WORKSPACE</button>
    </main>
  );
}
