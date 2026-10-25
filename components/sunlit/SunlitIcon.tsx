import type { CSSProperties } from "react";

export type SunlitIconName = "sun" | "overview" | "array" | "battery" | "clock" | "calendar" | "location" | "settings" | "arrow" | "chevron" | "close" | "play" | "pause" | "source" | "grid" | "layers" | "weather" | "chart" | "compare" | "cube" | "back";
const paths: Record<SunlitIconName, React.ReactNode> = {
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  overview: <><path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10" /></>,
  array: <><path d="m5 4-3 12h20L19 4H5ZM4 10h16M9 4l-1 12m7-12 1 12M12 16v5m-5 0h10" /></>,
  battery: <><rect x="7" y="5" width="10" height="17" rx="2" /><path d="M10 2h4M9 16h6m-6 3h6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 2v6m10-6v6M3 10h18m-13 4h2m4 0h2m-8 3h2" /></>,
  location: <><path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
  settings: <><path d="m10 2-.8 3-2.5 1.4-3-.8-2 3.4 2.2 2.2v2.8L1.7 16l2 3.4 3-.8 2.5 1.4.8 3h4l.8-3 2.5-1.4 3 .8 2-3.4-2.2-2.2v-2.8L22.3 9l-2-3.4-3 .8L14.8 5 14 2Z" transform="translate(1 0) scale(.92)" /><circle cx="12" cy="12" r="3" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  play: <path d="m8 4 12 8-12 8V4Z" fill="currentColor" strokeWidth="1" />,
  pause: <><path d="M8 5v14M16 5v14" strokeWidth="4" /></>,
  source: <><path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h6" /></>,
  grid: <><path d="m12 2-6 20m6-20 6 20M8 8h8M6 14h12M4 22h16M8 8l8 6m0-6-8 6m0 0 8 8m0-8-8 8" /></>,
  layers: <><path d="m12 3-10 5 10 5 10-5-10-5ZM2 12l10 5 10-5M2 16l10 5 10-5" /></>,
  weather: <><path d="M6 18a4 4 0 1 1 0-8 6 6 0 0 1 11-2 5 5 0 1 1 1 10H6Z" /></>,
  chart: <><path d="M3 3v18h18M7 16l4-6 4 3 6-8" /></>,
  compare: <><rect x="3" y="6" width="7" height="14" rx="2" /><rect x="14" y="3" width="7" height="17" rx="2" /></>,
  cube: <><path d="m12 2-9 5v10l9 5 9-5V7l-9-5ZM3 7l9 5 9-5M12 12v10M8 4l9 5" /></>,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
};
export function SunlitIcon({ name, className, style }: { name: SunlitIconName; className?: string; style?: CSSProperties }) {
  return <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
