import { SolarOperatingSystem } from "@/components/solar-os/SolarOperatingSystem";
import { compactOperatingSnapshot } from "@/lib/client-snapshot";
import { buildOperatingSnapshot } from "@/lib/operating-snapshot";

export default function Home() {
  const snapshot = compactOperatingSnapshot(buildOperatingSnapshot());
  return <SolarOperatingSystem snapshot={snapshot} />;
}
