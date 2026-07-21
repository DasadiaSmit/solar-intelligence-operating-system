"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { HourDatum } from "./model";
import { clamp, formatNumber, formatTimestamp } from "./model";

interface LinkedInstrumentProps {
  hours: HourDatum[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

type CanvasTone = "forecast" | "solar" | "positive" | "critical" | "model";

interface CanvasPalette {
  void: string;
  shell: string;
  instrument: string;
  instrument2: string;
  line: string;
  lineBright: string;
  text: string;
  muted: string;
  dim: string;
  solar: string;
  forecast: string;
  historical: string;
  positive: string;
  critical: string;
  model: string;
  fontMono: string;
}

const FALLBACK_FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const CANVAS_FALLBACKS: Omit<CanvasPalette, "fontMono"> = {
  void: "#070907",
  shell: "#0c100e",
  instrument: "#141b17",
  instrument2: "#1a231e",
  line: "#27332e",
  lineBright: "#41564d",
  text: "#f2eee4",
  muted: "#adb7b0",
  dim: "#7b8981",
  solar: "#e7c46a",
  forecast: "#72cdba",
  historical: "#86a5d1",
  positive: "#82c99f",
  critical: "#ee7b70",
  model: "#bda3d6",
};

function cssToken(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim();
  return value && !value.includes("var(") ? value : fallback;
}

function readCanvasPalette(canvas: HTMLCanvasElement): CanvasPalette {
  const style = getComputedStyle(canvas);
  return {
    void: cssToken(style, "--void", CANVAS_FALLBACKS.void),
    shell: cssToken(style, "--shell", CANVAS_FALLBACKS.shell),
    instrument: cssToken(style, "--instrument", CANVAS_FALLBACKS.instrument),
    instrument2: cssToken(style, "--instrument-2", CANVAS_FALLBACKS.instrument2),
    line: cssToken(style, "--line", CANVAS_FALLBACKS.line),
    lineBright: cssToken(style, "--line-bright", CANVAS_FALLBACKS.lineBright),
    text: cssToken(style, "--text", CANVAS_FALLBACKS.text),
    muted: cssToken(style, "--muted", CANVAS_FALLBACKS.muted),
    dim: cssToken(style, "--dim", CANVAS_FALLBACKS.dim),
    solar: cssToken(style, "--solar", CANVAS_FALLBACKS.solar),
    forecast: cssToken(style, "--forecast", CANVAS_FALLBACKS.forecast),
    historical: cssToken(style, "--historical", CANVAS_FALLBACKS.historical),
    positive: cssToken(style, "--positive", CANVAS_FALLBACKS.positive),
    critical: cssToken(style, "--critical", CANVAS_FALLBACKS.critical),
    model: cssToken(style, "--model", CANVAS_FALLBACKS.model),
    fontMono: style.fontFamily || FALLBACK_FONT_MONO,
  };
}

type Rgb = readonly [number, number, number];

function colourChannels(value: string, fallback: string): Rgb {
  const hex = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (hex) {
    const expanded = hex.length === 3 ? [...hex].map((channel) => channel + channel).join("") : hex;
    return [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16)) as unknown as Rgb;
  }
  const rgb = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return colourChannels(fallback, "#000000");
}

function alphaColour(value: string, alpha: number, fallback = CANVAS_FALLBACKS.text): string {
  const [red, green, blue] = colourChannels(value, fallback);
  return `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${clamp(alpha, 0, 1)})`;
}

function mixColour(from: string, to: string, amount: number, alpha = 1): string {
  const start = colourChannels(from, CANVAS_FALLBACKS.instrument);
  const end = colourChannels(to, CANVAS_FALLBACKS.forecast);
  const ratio = clamp(amount, 0, 1);
  return `rgba(${Math.round(start[0] + (end[0] - start[0]) * ratio)}, ${Math.round(start[1] + (end[1] - start[1]) * ratio)}, ${Math.round(start[2] + (end[2] - start[2]) * ratio)}, ${clamp(alpha, 0, 1)})`;
}

function canvasFont(palette: CanvasPalette, size: number, weight = 400): string {
  return `${weight} ${size}px ${palette.fontMono}`;
}

function setupCanvas(canvas: HTMLCanvasElement): CanvasSize | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height, dpr };
}

function useCanvasDraw(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  draw: (context: CanvasRenderingContext2D, size: CanvasSize, palette: CanvasPalette) => void,
  dependencies: React.DependencyList,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    const render = () => {
      frame = 0;
      const size = setupCanvas(canvas);
      const context = canvas.getContext("2d");
      if (size && context) draw(context, size, readCanvasPalette(canvas));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    render();
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    const themeObserver = new MutationObserver(schedule);
    const themeRoot = canvas.closest(".solar-os") ?? document.documentElement;
    themeObserver.observe(themeRoot, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    if (themeRoot !== document.body) {
      themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
    }
    let disposed = false;
    const fontSet = document.fonts;
    const fontReady = () => schedule();
    void fontSet.ready.then(() => {
      if (!disposed) schedule();
    });
    fontSet.addEventListener("loadingdone", fontReady);
    return () => {
      disposed = true;
      observer.disconnect();
      themeObserver.disconnect();
      fontSet.removeEventListener("loadingdone", fontReady);
      if (frame) cancelAnimationFrame(frame);
    };
    // The instrument redraw contract is explicitly controlled by callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

function powerColour(ratio: number, palette: CanvasPalette): string {
  const t = clamp(ratio, 0, 1);
  const low = mixColour(palette.instrument2, palette.forecast, 0.12);
  const middle = mixColour(palette.instrument2, palette.forecast, 0.72);
  if (t < 0.12) return mixColour(palette.instrument, low, t / 0.12, 0.34 + t * 2);
  if (t < 0.55) {
    const q = (t - 0.12) / 0.43;
    return mixColour(low, middle, q);
  }
  const q = (t - 0.55) / 0.45;
  return mixColour(middle, palette.solar, q);
}

function dateIndexFromPointer(event: React.PointerEvent<HTMLCanvasElement>, length: number, left = 34, right = 12): number {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const plotWidth = Math.max(1, rect.width - left - right);
  return clamp(Math.round(((x - left) / plotWidth) * Math.max(0, length - 1)), 0, Math.max(0, length - 1));
}

export function AnnualChronology({
  hours,
  baseHours,
  selectedIndex,
  onSelect,
}: LinkedInstrumentProps & { baseHours?: HourDatum[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxPower = useMemo(
    () => Math.max(1, ...hours.map((item) => Math.max(item.p90Kw, item.acKw))),
    [hours],
  );

  const draw = useCallback((context: CanvasRenderingContext2D, { width, height }: CanvasSize, palette: CanvasPalette) => {
    context.clearRect(0, 0, width, height);
    const left = 34;
    const right = 12;
    const top = 18;
    const bottom = 24;
    const plotWidth = Math.max(1, width - left - right);
    const plotHeight = Math.max(1, height - top - bottom);
    const xAt = (index: number) => left + (index / Math.max(1, hours.length - 1)) * plotWidth;
    const yAt = (value: number) => top + plotHeight - (value / maxPower) * plotHeight;

    const fade = context.createLinearGradient(0, top, 0, top + plotHeight);
    fade.addColorStop(0, alphaColour(palette.solar, 0.055));
    fade.addColorStop(1, alphaColour(palette.forecast, 0));
    context.fillStyle = fade;
    context.fillRect(left, top, plotWidth, plotHeight);

    context.strokeStyle = alphaColour(palette.lineBright, 0.52);
    context.lineWidth = 1;
    context.setLineDash([2, 5]);
    context.font = canvasFont(palette, 9);
    context.fillStyle = alphaColour(palette.muted, 0.78);
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = top + (plotHeight * tick) / 4;
      context.beginPath();
      context.moveTo(left, y + 0.5);
      context.lineTo(width - right, y + 0.5);
      context.stroke();
      context.fillText(`${formatNumber(maxPower * (1 - tick / 4), 1)}`, 2, y + 3);
    }
    context.setLineDash([]);

    for (let month = 0; month <= 12; month += 1) {
      const x = left + (plotWidth * month) / 12;
      context.strokeStyle = month % 3 === 0
        ? alphaColour(palette.forecast, 0.24)
        : alphaColour(palette.lineBright, 0.22);
      context.beginPath();
      context.moveTo(x + 0.5, top);
      context.lineTo(x + 0.5, top + plotHeight);
      context.stroke();
      if (month < 12) {
        const labels = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        context.fillStyle = alphaColour(palette.muted, 0.74);
        context.fillText(labels[month], x + 4, height - 7);
      }
    }

    if (!hours.length) {
      context.fillStyle = alphaColour(palette.muted, 0.84);
      context.font = canvasFont(palette, 11, 500);
      context.fillText("NO HOURLY RECORDS — CHECK PROVIDER SNAPSHOT", left + 12, top + 32);
      return;
    }

    const step = Math.max(1, Math.floor(hours.length / Math.max(360, plotWidth * 1.3)));
    context.beginPath();
    for (let index = 0; index < hours.length; index += step) {
      const item = hours[index];
      const x = xAt(index);
      const y = yAt(item.p90Kw);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    for (let index = hours.length - 1; index >= 0; index -= step) {
      const item = hours[index];
      context.lineTo(xAt(index), yAt(item.p10Kw));
    }
    context.closePath();
    const confidence = context.createLinearGradient(0, top, 0, top + plotHeight);
    confidence.addColorStop(0, alphaColour(palette.forecast, 0.24));
    confidence.addColorStop(1, alphaColour(palette.forecast, 0.035));
    context.fillStyle = confidence;
    context.fill();

    if (baseHours && baseHours.length === hours.length && baseHours.some((item, i) => Math.abs(item.acKw - hours[i].acKw) > 0.001)) {
      context.beginPath();
      for (let index = 0; index < baseHours.length; index += step) {
        const x = xAt(index);
        const y = yAt(baseHours[index].acKw);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = alphaColour(palette.historical, 0.55);
      context.lineWidth = 1;
      context.setLineDash([3, 4]);
      context.stroke();
      context.setLineDash([]);
    }

    context.beginPath();
    for (let index = 0; index < hours.length; index += step) {
      const x = xAt(index);
      const y = yAt(hours[index].acKw);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = palette.solar;
    context.lineWidth = 1.45;
    context.shadowColor = alphaColour(palette.solar, 0.34);
    context.shadowBlur = 7;
    context.stroke();
    context.shadowBlur = 0;

    const safeIndex = clamp(selectedIndex, 0, hours.length - 1);
    const selected = hours[safeIndex];
    const cursorX = xAt(safeIndex);
    const cursorY = yAt(selected.acKw);
    context.strokeStyle = alphaColour(palette.text, 0.76);
    context.lineWidth = 1;
    context.setLineDash([2, 3]);
    context.beginPath();
    context.moveTo(cursorX + 0.5, top);
    context.lineTo(cursorX + 0.5, top + plotHeight);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = palette.solar;
    context.beginPath();
    context.arc(cursorX, cursorY, 3.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = alphaColour(palette.solar, 0.34);
    context.lineWidth = 5;
    context.stroke();
  }, [baseHours, hours, maxPower, selectedIndex]);

  useCanvasDraw(canvasRef, draw, [draw]);
  const selected = hours[clamp(selectedIndex, 0, Math.max(0, hours.length - 1))];

  return (
    <figure className="canvas-figure chronology-figure" data-testid="annual-chronology">
      <canvas
        ref={canvasRef}
        role="img"
        tabIndex={0}
        aria-label="Annual hourly AC generation chronology with P10 to P90 confidence band. Move across the chart to link the time cursor."
        onPointerMove={(event) => hours.length && onSelect(dateIndexFromPointer(event, hours.length))}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") onSelect(clamp(selectedIndex - 1, 0, Math.max(0, hours.length - 1)));
          if (event.key === "ArrowRight") onSelect(clamp(selectedIndex + 1, 0, Math.max(0, hours.length - 1)));
        }}
      />
      <figcaption className="sr-only">
        {selected
          ? `${formatTimestamp(selected.timestamp)}: ${formatNumber(selected.acKw, 2)} kilowatts AC, P10 ${formatNumber(selected.p10Kw, 2)}, P90 ${formatNumber(selected.p90Kw, 2)}.`
          : "No hourly forecast records are available."}
      </figcaption>
    </figure>
  );
}

export function ProductionDNA({ hours, selectedIndex, onSelect }: LinkedInstrumentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxPower = useMemo(() => Math.max(1, ...hours.map((item) => item.acKw)), [hours]);

  const draw = useCallback((context: CanvasRenderingContext2D, { width, height }: CanvasSize, palette: CanvasPalette) => {
    context.clearRect(0, 0, width, height);
    const left = 32;
    const right = 8;
    const top = 10;
    const bottom = 20;
    const plotWidth = Math.max(1, width - left - right);
    const plotHeight = Math.max(1, height - top - bottom);
    const columns = Math.max(1, Math.ceil(hours.length / 24));
    const cellWidth = plotWidth / columns;
    const cellHeight = plotHeight / 24;

    context.fillStyle = alphaColour(palette.shell, 0.94);
    context.fillRect(left, top, plotWidth, plotHeight);
    hours.forEach((item, index) => {
      const day = Math.floor(index / 24);
      const hour = index % 24;
      const qualityOpacity = 0.42 + item.quality * 0.58;
      context.globalAlpha = qualityOpacity;
      context.fillStyle = powerColour(item.acKw / maxPower, palette);
      context.fillRect(left + day * cellWidth, top + hour * cellHeight, Math.max(1, cellWidth + 0.2), Math.max(1, cellHeight + 0.2));
    });
    context.globalAlpha = 1;

    context.strokeStyle = alphaColour(palette.forecast, 0.18);
    context.lineWidth = 1;
    for (let month = 0; month <= 12; month += 1) {
      const x = left + (plotWidth * month) / 12;
      context.beginPath();
      context.moveTo(x + 0.5, top);
      context.lineTo(x + 0.5, top + plotHeight);
      context.stroke();
    }
    for (let hour = 0; hour <= 24; hour += 6) {
      const y = top + (plotHeight * hour) / 24;
      context.beginPath();
      context.moveTo(left, y + 0.5);
      context.lineTo(width - right, y + 0.5);
      context.stroke();
      context.fillStyle = alphaColour(palette.muted, 0.74);
      context.font = canvasFont(palette, 9);
      context.fillText(`${String(hour).padStart(2, "0")}`, 6, Math.min(height - 5, y + 3));
    }

    if (hours.length) {
      const safeIndex = clamp(selectedIndex, 0, hours.length - 1);
      const day = Math.floor(safeIndex / 24);
      const hour = safeIndex % 24;
      context.strokeStyle = alphaColour(palette.text, 0.88);
      context.lineWidth = 1;
      context.strokeRect(left + day * cellWidth - 0.5, top + hour * cellHeight - 0.5, Math.max(2, cellWidth + 1), Math.max(2, cellHeight + 1));
    }
  }, [hours, maxPower, selectedIndex]);

  useCanvasDraw(canvasRef, draw, [draw]);

  const selectFromPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hours.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left - 32, 0, Math.max(1, rect.width - 40));
    const y = clamp(event.clientY - rect.top - 10, 0, Math.max(1, rect.height - 30));
    const day = Math.floor((x / Math.max(1, rect.width - 40)) * Math.ceil(hours.length / 24));
    const hour = Math.floor((y / Math.max(1, rect.height - 30)) * 24);
    onSelect(clamp(day * 24 + hour, 0, hours.length - 1));
  };

  return (
    <figure className="canvas-figure dna-figure" data-testid="production-dna">
      <canvas
        ref={canvasRef}
        role="img"
        tabIndex={0}
        aria-label="Solar Production DNA heatmap. Days run left to right and hours run top to bottom; brightness represents AC production and opacity represents data quality."
        onPointerMove={selectFromPointer}
        onClick={selectFromPointer}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") onSelect(clamp(selectedIndex - 24, 0, Math.max(0, hours.length - 1)));
          if (event.key === "ArrowRight") onSelect(clamp(selectedIndex + 24, 0, Math.max(0, hours.length - 1)));
          if (event.key === "ArrowUp") onSelect(clamp(selectedIndex - 1, 0, Math.max(0, hours.length - 1)));
          if (event.key === "ArrowDown") onSelect(clamp(selectedIndex + 1, 0, Math.max(0, hours.length - 1)));
        }}
      />
      <figcaption className="sr-only">Eight thousand seven hundred and sixty hourly cells expose seasonality, cloud regimes, missingness, and anomalous production.</figcaption>
    </figure>
  );
}

export function OrbitalTimeline({ hours, selectedIndex, onSelect }: LinkedInstrumentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const daily = useMemo(() => {
    const days: Array<{ maxPoa: number; cloud: number; daylightHours: number }> = [];
    for (let index = 0; index < hours.length; index += 24) {
      const slice = hours.slice(index, index + 24);
      days.push({
        maxPoa: Math.max(0, ...slice.map((item) => item.poa)),
        cloud: slice.length ? slice.reduce((sum, item) => sum + item.cloud, 0) / slice.length : 0,
        daylightHours: slice.filter((item) => item.ghi > 2).length,
      });
    }
    return days;
  }, [hours]);

  const draw = useCallback((context: CanvasRenderingContext2D, { width, height }: CanvasSize, palette: CanvasPalette) => {
    context.clearRect(0, 0, width, height);
    const left = 8;
    const right = 8;
    const top = 8;
    const bottom = 10;
    const plotWidth = Math.max(1, width - left - right);
    const plotHeight = Math.max(1, height - top - bottom);
    const centre = top + plotHeight * 0.57;
    const maxPoa = Math.max(1, ...daily.map((item) => item.maxPoa));

    const atmosphere = context.createLinearGradient(0, top, 0, height - bottom);
    atmosphere.addColorStop(0, alphaColour(palette.forecast, 0.07));
    atmosphere.addColorStop(0.55, alphaColour(palette.solar, 0.04));
    atmosphere.addColorStop(1, alphaColour(palette.void, 0));
    context.fillStyle = atmosphere;
    context.fillRect(left, top, plotWidth, plotHeight);

    context.strokeStyle = alphaColour(palette.lineBright, 0.58);
    context.beginPath();
    context.moveTo(left, centre + 0.5);
    context.lineTo(width - right, centre + 0.5);
    context.stroke();

    if (daily.length) {
      context.beginPath();
      daily.forEach((day, index) => {
        const x = left + (index / Math.max(1, daily.length - 1)) * plotWidth;
        const seasonalArc = Math.sin((index / Math.max(1, daily.length - 1)) * Math.PI);
        const amplitude = 12 + seasonalArc * plotHeight * 0.28;
        const y = centre - amplitude * (day.maxPoa / maxPoa);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = palette.solar;
      context.lineWidth = 1.3;
      context.shadowBlur = 8;
      context.shadowColor = alphaColour(palette.solar, 0.4);
      context.stroke();
      context.shadowBlur = 0;

      daily.forEach((day, index) => {
        if (index % 2) return;
        const x = left + (index / Math.max(1, daily.length - 1)) * plotWidth;
        context.fillStyle = alphaColour(palette.forecast, 0.02 + day.cloud * 0.14);
        context.fillRect(x, top, Math.max(1, plotWidth / daily.length * 2), plotHeight * 0.36);
      });

      const dayIndex = clamp(Math.floor(selectedIndex / 24), 0, daily.length - 1);
      const selectedDay = daily[dayIndex];
      const x = left + (dayIndex / Math.max(1, daily.length - 1)) * plotWidth;
      const seasonalArc = Math.sin((dayIndex / Math.max(1, daily.length - 1)) * Math.PI);
      const amplitude = 12 + seasonalArc * plotHeight * 0.28;
      const y = centre - amplitude * (selectedDay.maxPoa / maxPoa);
      context.strokeStyle = alphaColour(palette.text, 0.72);
      context.setLineDash([2, 3]);
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, height - bottom);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = palette.solar;
      context.beginPath();
      context.arc(x, y, 4, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = alphaColour(palette.solar, 0.26);
      context.lineWidth = 8;
      context.stroke();
    }
  }, [daily, selectedIndex]);

  useCanvasDraw(canvasRef, draw, [draw]);
  return (
    <figure className="canvas-figure orbital-figure" data-testid="orbital-timeline">
      <canvas
        ref={canvasRef}
        role="img"
        tabIndex={0}
        aria-label="Solar orbital timeline showing the annual irradiance envelope and cloud ribbon."
        onPointerMove={(event) => {
          if (!hours.length) return;
          const dayIndex = dateIndexFromPointer(event, Math.ceil(hours.length / 24), 8, 8);
          onSelect(clamp(dayIndex * 24 + (hours[selectedIndex]?.hour ?? 12), 0, hours.length - 1));
        }}
      />
      <figcaption className="sr-only">Select any day to move the shared cursor while preserving the selected hour.</figcaption>
    </figure>
  );
}

export function MicroTrace({
  values,
  compare,
  label,
  tone = "forecast",
}: {
  values: number[];
  compare?: number[];
  label: string;
  tone?: CanvasTone;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draw = useCallback((context: CanvasRenderingContext2D, { width, height }: CanvasSize, palette: CanvasPalette) => {
    context.clearRect(0, 0, width, height);
    const all = [...values, ...(compare ?? [])];
    const max = Math.max(1, ...all);
    const min = Math.min(0, ...all);
    const range = Math.max(1e-6, max - min);
    const colour = palette[tone];
    const line = (data: number[], stroke: string, dash = false) => {
      context.beginPath();
      data.forEach((value, index) => {
        const x = (index / Math.max(1, data.length - 1)) * width;
        const y = height - ((value - min) / range) * (height - 4) - 2;
        if (!index) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = stroke;
      context.lineWidth = 1.25;
      context.setLineDash(dash ? [3, 3] : []);
      context.stroke();
      context.setLineDash([]);
    };
    if (compare?.length) line(compare, alphaColour(palette.historical, 0.55), true);
    line(values, colour);
  }, [compare, tone, values]);
  useCanvasDraw(canvasRef, draw, [draw]);
  return <canvas className="micro-trace" ref={canvasRef} role="img" aria-label={label} />;
}
