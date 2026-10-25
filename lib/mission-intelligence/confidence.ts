import type {
  ConfidenceDimensionV1,
  EvidenceDatumV1,
  MissionConfidenceV1,
} from "./contracts";

function mean(values: readonly number[]): number | null {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function validFraction(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= 1;
}

function availableEvidence(evidence: readonly EvidenceDatumV1[]): EvidenceDatumV1[] {
  return evidence.filter((datum) => datum.availability === "available");
}

function dimension(
  id: ConfidenceDimensionV1["id"],
  label: string,
  score: number | null,
  basis: string,
  evidenceRefIds: readonly string[],
): ConfidenceDimensionV1 {
  return { id, label, score, basis, evidenceRefIds };
}

function timestampAligned(datum: EvidenceDatumV1, linkedTimestampUtc: string): boolean | null {
  const linked = Date.parse(linkedTimestampUtc);
  if (!Number.isFinite(linked)) return null;
  if (datum.ref.timestampUtc) {
    const timestamp = Date.parse(datum.ref.timestampUtc);
    return Number.isFinite(timestamp) ? timestamp === linked : null;
  }
  if (!datum.ref.validRangeUtc) return null;
  const start = Date.parse(datum.ref.validRangeUtc[0]);
  const end = Date.parse(datum.ref.validRangeUtc[1]);
  return Number.isFinite(start) && Number.isFinite(end) ? linked >= start && linked <= end : null;
}

/**
 * Produces an evidence-support index, never an "AI confidence" probability.
 *
 * Each available dimension is directly measurable:
 * - quality and completeness are supplied by the evidence source;
 * - provenance coverage is the fraction explicitly marked verified;
 * - temporal alignment is the fraction whose timestamp/range contains the
 *   linked cursor time.
 *
 * The aggregate is the unweighted arithmetic mean of dimensions that can be
 * measured. Missing dimensions remain null and do not receive invented values.
 */
export function assessMissionConfidence(
  evidence: readonly EvidenceDatumV1[],
  linkedTimestampUtc: string | null,
): MissionConfidenceV1 {
  const supporting = availableEvidence(evidence);
  const qualityEvidence = supporting.filter((datum) => validFraction(datum.ref.quality.score));
  const completenessEvidence = supporting.filter((datum) => validFraction(datum.ref.quality.completeness));
  const provenanceEvidence = supporting.filter((datum) => datum.ref.resultId && datum.ref.locator);

  const qualityScore = mean(qualityEvidence.map((datum) => datum.ref.quality.score as number));
  const completenessScore = mean(
    completenessEvidence.map((datum) => datum.ref.quality.completeness as number),
  );
  const provenanceScore = mean(
    provenanceEvidence.map((datum) => datum.ref.provenance.verified ? 1 : 0),
  );

  const temporalAssessments = linkedTimestampUtc
    ? supporting.flatMap((datum) => {
        const aligned = timestampAligned(datum, linkedTimestampUtc);
        return aligned === null ? [] : [{ datum, aligned }];
      })
    : [];
  const temporalScore = mean(temporalAssessments.map((item) => item.aligned ? 1 : 0));

  const dimensions: ConfidenceDimensionV1[] = [
    dimension(
      "data-quality",
      "Source data quality",
      qualityScore,
      qualityScore === null
        ? "No supporting reference supplied a valid 0–1 quality score."
        : "Arithmetic mean of source-supplied quality scores for supporting references.",
      qualityEvidence.map((datum) => datum.ref.id),
    ),
    dimension(
      "completeness",
      "Source completeness",
      completenessScore,
      completenessScore === null
        ? "No supporting reference supplied a valid 0–1 completeness value."
        : "Arithmetic mean of source-supplied completeness values for supporting references.",
      completenessEvidence.map((datum) => datum.ref.id),
    ),
    dimension(
      "provenance-coverage",
      "Verified provenance coverage",
      provenanceScore,
      provenanceScore === null
        ? "No supporting evidence reference carried a resolvable result and locator."
        : "Fraction of resolvable supporting references explicitly marked provenance-verified.",
      provenanceEvidence.map((datum) => datum.ref.id),
    ),
    dimension(
      "temporal-alignment",
      "Linked-time alignment",
      temporalScore,
      linkedTimestampUtc === null
        ? "No linked timestamp applies to this objective."
        : temporalScore === null
          ? "Supporting references did not declare a comparable timestamp or valid range."
          : "Fraction of timestamped supporting references aligned with the linked cursor time.",
      temporalAssessments.map((item) => item.datum.ref.id),
    ),
  ];
  const measured = dimensions.flatMap((item) => item.score === null ? [] : [item.score]);
  return {
    evidenceSupportScore: mean(measured),
    dimensions,
    method: "equal-mean-of-available-evidence-dimensions",
    notice: "Evidence-support score, not a probability of correctness or guaranteed outcome.",
  };
}
