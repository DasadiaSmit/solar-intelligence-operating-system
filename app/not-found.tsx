import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-state system-state-error">
      <span>SI·OS / UNCHARTED COORDINATE</span>
      <h1>This operating workspace does not exist</h1>
      <p>Return to the annual observatory; no model, dataset or scenario state was changed.</p>
      <Link href="/">RETURN TO MISSION CONTROL</Link>
    </main>
  );
}
