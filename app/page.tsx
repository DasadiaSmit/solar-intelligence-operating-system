import { SolarOperatingSystem } from "@/components/solar-os/SolarOperatingSystem";
import { compactOperatingSnapshot } from "@/lib/client-snapshot";
import { CALCULATION_VERSION } from "@/lib/contracts";
import { buildOperatingSnapshot } from "@/lib/operating-snapshot";
import { reproducibleId } from "@/lib/provenance";

export default async function Home() {
  const operatingSnapshot = buildOperatingSnapshot();
  const resultId = await reproducibleId("sim", {
    config: operatingSnapshot.config,
    calculationVersion: CALCULATION_VERSION,
    representativeYearId: operatingSnapshot.representativeYear.id,
  });
  const snapshot = compactOperatingSnapshot(operatingSnapshot, resultId);
  return <SolarOperatingSystem snapshot={snapshot} />;
}
