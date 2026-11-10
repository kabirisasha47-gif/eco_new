import type { ReactNode } from "react";

import { fa, faDigits } from "@/lib/fa";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const f2 = (n: number) => n.toFixed(2);

function linePath(points: [number, number][]) {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${f2(x)} ${f2(y)}`).join(" ");
}

/* ------------------------------------------------------------------ */
/* 02 — daily production area chart                                    */
/* ------------------------------------------------------------------ */

export function productionAt(h: number, peak = 3.6) {
  if (h <= 5.6 || h >= 18.4) return 0;
  return peak * Math.exp(-Math.pow(h - 12, 2) / (2 * 2.35 * 2.35));
}

export function ProductionChart({ nowHour = 14.6, peak = 3.6 }: { nowHour?: number; peak?: number }) {
  const W = 320;
  const H = 210;
  const left = 8;
  const right = 292;
  const top = 46;
  const bottom = 184;
  const hMin = 5.5;
  const hMax = 19;
  const yMax = 4;
  const x = (h: number) => left + ((h - hMin) / (hMax - hMin)) * (right - left);
  const y = (v: number) => bottom - (v / yMax) * (bottom - top);

  const actual: [number, number][] = [];
  for (let h = hMin; h <= nowHour + 0.001; h += 0.2) actual.push([x(h), y(productionAt(h, peak))]);
  actual.push([x(nowHour), y(productionAt(nowHour, peak))]);

  const forecast: [number, number][] = [];
  const bandTop: [number, number][] = [];
  const bandBottom: [number, number][] = [];
  for (let h = nowHour; h <= 18.6; h += 0.2) {
    const v = productionAt(h, peak) * 0.94;
    const spread = (h - nowHour) * 0.14;
    forecast.push([x(h), y(v)]);
    bandTop.push([x(h), y(Math.min(yMax, v + spread))]);
    bandBottom.push([x(h), y(Math.max(0, v - spread))]);
  }

  const areaPath = `${linePath(actual)} L${f2(x(nowHour))} ${bottom} L${f2(x(hMin))} ${bottom} Z`;
  const bandPath = `${linePath(bandTop)} ${bandBottom
    .reverse()
    .map(([bx, by]) => `L${f2(bx)} ${f2(by)}`)
    .join(" ")} Z`;
  const nowY = y(productionAt(nowHour, peak));

  return (
    <div className="relative mt-4" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="نمودار تولید امروز">
        {[0, 2, 4].map((t) => (
          <g key={t}>
            <line x1={left} x2={right} y1={y(t)} y2={y(t)} className="stroke-track-strong" strokeDasharray="2 4" />
            <text x={W - 6} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {faDigits(t)}
            </text>
          </g>
        ))}
        <text x={W - 6} y={top - 16} textAnchor="end" className="fill-muted-foreground text-[10px]">
          kW
        </text>
        <path d={areaPath} className="fill-sun-soft" />
        <path d={linePath(actual)} className="fill-none stroke-sun-deep" strokeWidth="2.5" strokeLinecap="round" />
        <path d={bandPath} className="fill-sun-soft" opacity="0.8" />
        <path d={linePath(forecast)} className="fill-none stroke-sun-deep" strokeWidth="2" strokeDasharray="4 4" />
        <line x1={x(12)} x2={x(12)} y1={top - 8} y2={y(peak)} className="stroke-sun-deep" strokeDasharray="2 3" />
        <line x1={x(nowHour)} x2={x(nowHour)} y1={top - 8} y2={bottom} className="stroke-track-strong" strokeDasharray="3 3" />
        <circle cx={x(nowHour)} cy={nowY} r="6" className="fill-card stroke-sun-deep" strokeWidth="2.5" />
        {[
          [6, "۶ صبح"],
          [12, "۱۲ ظهر"],
          [18, "۶ عصر"],
        ].map(([h, l]) => (
          <text key={l} x={x(h as number)} y={H - 4} textAnchor="middle" className="fill-muted-foreground text-[10px]">
            {l}
          </text>
        ))}
      </svg>
      <span
        className="absolute top-0 -translate-x-1/2 rounded-full bg-card px-3 py-1.5 text-xs font-extrabold shadow-soft"
        style={{ left: `${(x(12) / W) * 100}%` }}
        dir="rtl"
      >
        اوج تولید {fa(peak, 1)} kW
      </span>
      <span
        className="absolute rounded-full bg-sun-soft px-2.5 py-1 text-[0.65rem] text-foreground/80"
        style={{ left: `${(x(nowHour + 0.6) / W) * 100}%`, top: "26%" }}
        dir="rtl"
      >
        پیش‌بینی | سناریو
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Generic vertical bar chart (RTL: first item on the right)            */
/* ------------------------------------------------------------------ */

interface BarDatum {
  label: string;
  value: number;
}

export function BarChart({
  data,
  max,
  ticks,
  unit = "kWh",
  selected,
  onSelect,
  tooltip,
  footLabel,
  barClassName,
  height = 200,
}: {
  data: BarDatum[];
  max: number;
  ticks: number[];
  unit?: string;
  selected?: number | undefined;
  onSelect?: (i: number) => void;
  tooltip?: (d: BarDatum, i: number) => ReactNode;
  footLabel?: string;
  barClassName?: string;
  height?: number;
}) {
  return (
    <div className="mt-5">
      <div className="flex justify-end text-[10px] text-muted-foreground" dir="ltr">
        <span className="me-auto">{unit}</span>
      </div>
      <div className="relative mt-2 flex gap-2" style={{ height }}>
        <div className="relative w-7 shrink-0 text-[10px] text-muted-foreground">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
              {fa(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-dashed border-track-strong"
              style={{ top: `${(1 - t / max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end justify-between gap-1.5">
            {data.map((d, i) => {
              const isSel = selected === i;
              return (
                <button
                  key={d.label + i}
                  type="button"
                  aria-label={`${d.label}: ${fa(d.value)} ${unit}`}
                  onClick={() => onSelect?.(i)}
                  className="relative flex h-full flex-1 items-end"
                >
                  {isSel && tooltip ? (
                    <span className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-3 py-1.5 text-xs font-extrabold shadow-soft"
                      style={{ bottom: `calc(${(d.value / max) * 100}% + 10px)` }}
                    >
                      {tooltip(d, i)}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "block w-full rounded-full transition-all duration-500",
                      isSel ? "bg-sun-deep" : (barClassName ?? "bg-sun"),
                    )}
                    style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <div className="w-7 shrink-0" />
        <div className="flex flex-1 justify-between gap-1.5">
          {data.map((d, i) => (
            <span
              key={d.label + i}
              className={cn(
                "flex-1 text-center text-[10px]",
                selected === i ? "font-black text-foreground" : "text-muted-foreground",
              )}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
      {footLabel ? <p className="mt-2 text-[10px] text-muted-foreground">{footLabel}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — temperature plan chart                                          */
/* ------------------------------------------------------------------ */

export function outsideTempAt(h: number, shift = 0) {
  // Night low near 6am, afternoon high near 15h.
  const keys: [number, number][] = [
    [0, 28],
    [6, 25.5],
    [10, 31],
    [15, 37.5],
    [20, 33],
    [24, 28.5],
  ];
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, t0] = keys[i]!;
    const [h1, t1] = keys[i + 1]!;
    if (h >= h0 && h <= h1) {
      const p = (h - h0) / (h1 - h0);
      const s = (1 - Math.cos(Math.PI * p)) / 2;
      return t0 + (t1 - t0) * s + shift;
    }
  }
  return 28 + shift;
}

export interface SetpointStep {
  from: number;
  to: number;
  temp: number;
}

export function TempPlanChart({ steps, shift = 0, preCool }: { steps: SetpointStep[]; shift?: number; preCool: number }) {
  const W = 320;
  const H = 220;
  const left = 10;
  const right = 288;
  const top = 20;
  const bottom = 190;
  const tMin = 20;
  const tMax = 40;
  const x = (h: number) => left + (h / 24) * (right - left);
  const y = (t: number) => bottom - ((t - tMin) / (tMax - tMin)) * (bottom - top);

  const outside: [number, number][] = [];
  for (let h = 0; h <= 24; h += 0.25) outside.push([x(h), y(outsideTempAt(h, shift))]);

  const stepPts: [number, number][] = [];
  steps.forEach((s) => {
    stepPts.push([x(s.from), y(s.temp)]);
    stepPts.push([x(s.to), y(s.temp)]);
  });
  const stepFill = `${linePath(stepPts)} L${f2(x(24))} ${bottom} L${f2(x(0))} ${bottom} Z`;
  const preStep = steps.find((s) => s.temp === preCool);

  return (
    <div className="relative mt-3" dir="ltr">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-3" dir="rtl">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full bg-sun-deep" /> دمای پیشنهادی
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-4 rounded-full bg-track-strong" /> دمای بیرون
          </span>
        </span>
        <span>درجه</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="برنامه دمایی">
        <rect x={x(19)} y={top} width={x(23) - x(19)} height={bottom - top} className="fill-danger-soft" />
        <text x={(x(19) + x(23)) / 2} y={top + 16} textAnchor="middle" className="fill-danger text-[10px] font-bold">
          اوج تعرفه
        </text>
        {[20, 30, 40].map((t) => (
          <g key={t}>
            <line x1={left} x2={right} y1={y(t)} y2={y(t)} className="stroke-track-strong" strokeDasharray="2 4" />
            <text x={W - 4} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {faDigits(t)}
            </text>
          </g>
        ))}
        <path d={stepFill} className="fill-sun-soft" />
        <path d={linePath(stepPts)} className="fill-none stroke-sun-deep" strokeWidth="2.5" strokeLinejoin="round" />
        <path d={linePath(outside)} className="fill-none stroke-muted-foreground" strokeWidth="1.5" />
        {[
          [3, "۳"],
          [9, "۹"],
          [15, "۱۵"],
          [21, "۲۱"],
        ].map(([h, l]) => (
          <text key={l} x={x(h as number)} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
            {l}
          </text>
        ))}
        <text x={left} y={H - 6} textAnchor="start" className="fill-muted-foreground text-[10px]">
          ساعت
        </text>
      </svg>
      {preStep ? (
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-3 py-1.5 text-xs font-extrabold shadow-soft"
          style={{ left: `${(x((preStep.from + preStep.to) / 2) / W) * 100}%`, bottom: "22%" }}
          dir="rtl"
        >
          پیش‌سرمایش {fa(preCool)} درجه
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 07 — semicircle gauge                                                */
/* ------------------------------------------------------------------ */

export function Gauge({ ratio, label }: { ratio: number; label: string }) {
  const cx = 120;
  const cy = 120;
  const r = 96;
  const p = Math.max(0.001, Math.min(1, ratio));
  const theta = Math.PI * (1 - p);
  const ex = cx + r * Math.cos(theta);
  const ey = cy - r * Math.sin(theta);
  return (
    <div className="relative mx-auto mt-6 w-64">
      <svg viewBox="0 0 240 140" className="w-full" role="img" aria-label={label}>
        <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} className="fill-none stroke-track" strokeWidth="18" strokeLinecap="round" />
        <path
          d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${f2(ex)} ${f2(ey)}`}
          className="fill-none stroke-sun-deep transition-all duration-700"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <circle cx={f2(ex)} cy={f2(ey)} r="10" className="fill-card stroke-sun-deep" strokeWidth="4" />
      </svg>
      <div className="absolute inset-x-0 top-[44%] text-center">
        <div className="num text-5xl font-black leading-none">{fa(Math.round(ratio * 100))}٪</div>
        <div className="mt-2 text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="mt-1 flex justify-between px-3 text-[10px] text-muted-foreground" dir="ltr">
        <span>۰٪</span>
        <span>۱۰۰٪</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal progress (RTL fill from the right)                        */
/* ------------------------------------------------------------------ */

export function HBar({ ratio, className, trackClassName }: { ratio: number; className?: string; trackClassName?: string }) {
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full bg-track", trackClassName)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700", className ?? "bg-sun")}
        style={{ width: `${Math.max(2, Math.min(1, ratio) * 100)}%` }}
      />
    </div>
  );
}
