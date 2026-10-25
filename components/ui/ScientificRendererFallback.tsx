export interface ScientificFallbackFact {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
}

export interface ScientificRendererFallbackProps {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly facts?: readonly ScientificFallbackFact[];
  readonly status?: "ready" | "unavailable";
}

export function ScientificRendererFallback({
  id,
  title,
  summary,
  facts = [],
  status = "ready",
}: ScientificRendererFallbackProps) {
  const titleId = `${id}-title`;
  return (
    <section
      className="scientific-renderer-fallback"
      aria-labelledby={titleId}
      data-scientific-renderer-fallback
      data-fallback-status={status}
    >
      <span>HTML SCIENTIFIC FALLBACK</span>
      <h2 id={titleId}>{title}</h2>
      <p>{summary}</p>
      {facts.length > 0 && (
        <dl>
          {facts.map((fact) => (
            <div key={`${fact.label}:${fact.value}`}>
              <dt>{fact.label}</dt>
              <dd>
                {fact.value}
                {fact.unit ? ` ${fact.unit}` : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
