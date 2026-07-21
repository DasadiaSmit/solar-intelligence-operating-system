export default function Loading() {
  return (
    <main className="system-state" aria-busy="true" aria-live="polite">
      <div className="state-orbit" aria-hidden="true"><i /></div>
      <span>SI·OS / BOOT SEQUENCE</span>
      <h1>Constructing the annual operating snapshot</h1>
      <p>Resolving 8,760 linked hours, energy flow, forecast intervals and scientific provenance.</p>
      <div className="state-progress"><i /></div>
    </main>
  );
}
