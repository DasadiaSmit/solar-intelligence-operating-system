import { HeliosHero, SolarExperience } from "@/components/hero";
import { SunlitObservatory } from "@/components/sunlit/SunlitObservatory";
import { buildSunlitFrame } from "@/features/sunlit-observatory/build-frame";
import { SolarOperatingSystem } from "@/components/solar-os/SolarOperatingSystem";
import {
  buildAtmosphericObservationFrameV1,
} from "@/features/visual-computing/build-atmospheric-observation-frame";
import {
  buildBatteryEnergyFlowFrameV1,
} from "@/features/visual-computing/build-battery-energy-flow-frame";
import {
  buildAnnualEnergyFrameV1,
} from "@/features/visual-computing/build-annual-energy-frame";
import {
  buildArrayEngineeringFrameV1,
} from "@/features/visual-computing/build-array-engineering-frame";
import {
  buildRepresentativeHeroScene,
  HERO_LINKED_HOUR_INDEX,
} from "@/features/visual-computing/build-hero-scene";
import {
  buildScenarioComparisonFrameV1,
} from "@/features/visual-computing/build-scenario-comparison-frame";
import { compactOperatingSnapshot } from "@/lib/client-snapshot";
import {
  CALCULATION_VERSION,
  type LifecycleStatus,
} from "@/lib/contracts";
import { buildOperatingSnapshot } from "@/lib/operating-snapshot";
import { reproducibleId } from "@/lib/provenance";

const SCENE_LIFECYCLE = {
  implemented: "IMPLEMENTED",
  experimental: "EXPERIMENTAL",
  simulated: "SIMULATED",
  planned: "PLANNED",
} as const satisfies Readonly<Record<LifecycleStatus, string>>;

export default async function Home() {
  const operatingSnapshot = buildOperatingSnapshot();
  const resultId = await reproducibleId("sim", {
    config: operatingSnapshot.config,
    calculationVersion: CALCULATION_VERSION,
    representativeYearId: operatingSnapshot.representativeYear.id,
  });
  const snapshot = compactOperatingSnapshot(operatingSnapshot, resultId);
  const scene = buildRepresentativeHeroScene(snapshot);
  const sunlitFrame = buildSunlitFrame({ snapshot: operatingSnapshot, resultId });
  const atmosphericObservation =
    buildAtmosphericObservationFrameV1({
      snapshot: operatingSnapshot,
      resultId,
      selectedIndex: HERO_LINKED_HOUR_INDEX,
      lifecycle: operatingSnapshot.status.deterministic
        ? "SIMULATED"
        : SCENE_LIFECYCLE[operatingSnapshot.status.overall],
    });
  const annualEnergy = buildAnnualEnergyFrameV1({
    snapshot: operatingSnapshot,
    resultId,
    lifecycle: operatingSnapshot.status.deterministic
      ? "SIMULATED"
      : SCENE_LIFECYCLE[operatingSnapshot.status.overall],
  });
  const arrayEngineering = buildArrayEngineeringFrameV1({
    snapshot: operatingSnapshot,
    resultId,
    selectedIndex: HERO_LINKED_HOUR_INDEX,
    lifecycle: operatingSnapshot.status.deterministic
      ? "SIMULATED"
      : SCENE_LIFECYCLE[operatingSnapshot.status.overall],
  });
  const scenarioComparison = buildScenarioComparisonFrameV1({
    snapshot: operatingSnapshot,
    resultId,
    lifecycle: operatingSnapshot.status.deterministic
      ? "SIMULATED"
      : SCENE_LIFECYCLE[operatingSnapshot.status.overall],
  });
  const batteryEnergyFlow = buildBatteryEnergyFlowFrameV1({
    snapshot: operatingSnapshot,
    resultId,
    selectedIndex: HERO_LINKED_HOUR_INDEX,
    lifecycle: operatingSnapshot.status.deterministic
      ? "SIMULATED"
      : SCENE_LIFECYCLE[operatingSnapshot.status.overall],
  });

  return (
    <SolarExperience
      hero={(
        <SunlitObservatory initialFrame={sunlitFrame} legacyHero={(<HeliosHero
          annualEnergy={annualEnergy}
          arrayEngineering={arrayEngineering}
          atmosphericObservation={atmosphericObservation}
          batteryEnergyFlow={batteryEnergyFlow}
          scenarioComparison={scenarioComparison}
          scene={scene}
        />)} />
      )}
      application={<SolarOperatingSystem snapshot={snapshot} />}
    />
  );
}
