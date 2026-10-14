"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { HistoricalChartPoint } from "@/lib/services/marketData";
import {
  finite,
  researchPoints,
  technicalStudy,
  validOHLC,
  volumeDirection,
} from "@/lib/research/technicals";

export type ChartMode = "area" | "line" | "candles";
export type Overlay = "sma20" | "sma50" | "sma200" | "ema20";
const COLORS = { up: "#10b981", down: "#f43f5e", neutral: "#94a3b8" };
const OVERLAYS: Record<Overlay, string> = {
  sma20: "#f59e0b",
  sma50: "#8b5cf6",
  sma200: "#0ea5e9",
  ema20: "#14b8a6",
};
export const compactVolume = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const priceText = (value: number | null | undefined) =>
  finite(value)
    ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "Unavailable";
function pointDate(date: string, full = false) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    ...(full ? { year: "numeric", hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(date));
}

/** SVG keeps genuine candle wicks, bodies and volume on exactly the same observation axis. */
export function PriceHistoryCanvas({
  points: raw,
  mode,
  interval,
  overlays = [],
  volumeOnly = false,
}: {
  points: HistoricalChartPoint[];
  mode: ChartMode;
  interval: string;
  overlays?: Overlay[];
  volumeOnly?: boolean;
}) {
  const points = useMemo(() => researchPoints(raw), [raw]);
  const study = useMemo(
    () => technicalStudy(points, interval),
    [points, interval],
  );
  const [size, setSize] = useState<number | null>(null),
    [start, setStart] = useState(0),
    [hover, setHover] = useState<number | null>(null);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 420 });
  const hasPoints = points.length > 0;
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0)
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, [hasPoints]);
  const gradient = useId().replace(/:/g, "");
  const count = Math.min(size ?? points.length, points.length),
    offset = Math.max(0, Math.min(start, points.length - count));
  const visible = points.slice(offset, offset + count);
  const selected =
    visible[
      Math.max(0, Math.min(hover ?? visible.length - 1, visible.length - 1))
    ];
  const width = Math.max(240, dimensions.width),
    height = dimensions.height,
    left = 14,
    right = width - 86,
    top = 24,
    priceBottom = height * 0.67,
    volumeTop = volumeOnly ? 28 : height * 0.79,
    bottom = height - 28;
  const timeSpan = visible.length
    ? Date.parse(visible.at(-1)!.date) - Date.parse(visible[0].date)
    : 0;
  const intraday = interval.endsWith("m") || interval.endsWith("h");
  const axisDate = (date: string) =>
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      ...(intraday && timeSpan < 24 * 60 * 60 * 1000
        ? { hour: "2-digit", minute: "2-digit" }
        : timeSpan > 90 * 24 * 60 * 60 * 1000
          ? { month: "short", year: "2-digit" }
          : {
              day: "numeric",
              month: "short",
              ...(intraday ? { hour: "2-digit", minute: "2-digit" } : {}),
            }),
    }).format(new Date(date));
  const tickCount = width < 560 ? 3 : 5;
  const hasVolume = visible.some(
    (point) => finite(point.volume) && point.volume! >= 0,
  );
  const maxVolume = Math.max(
    1,
    ...visible.map((point) =>
      finite(point.volume) && point.volume! >= 0 ? point.volume! : 0,
    ),
  );
  const lows = visible.map((point) =>
    mode === "candles" && validOHLC(point) ? point.low! : point.close,
  );
  const highs = visible.map((point) =>
    mode === "candles" && validOHLC(point) ? point.high! : point.close,
  );
  for (const overlay of overlays)
    for (const value of study.indicators[overlay].slice(offset, offset + count))
      if (finite(value)) {
        lows.push(value);
        highs.push(value);
      }
  const low = Math.min(
    ...visible.map((point) =>
      mode === "candles" && validOHLC(point) ? point.low! : point.close,
    ),
  );
  const high = Math.max(
    ...visible.map((point) =>
      mode === "candles" && validOHLC(point) ? point.high! : point.close,
    ),
  );
  const domainLow = Math.min(...lows),
    domainHigh = Math.max(...highs),
    padding = (domainHigh - domainLow) * 0.08 || Math.max(domainHigh * 0.01, 1);
  const floor = Math.max(0, domainLow - padding),
    ceiling = domainHigh + padding;
  const x = (i: number) =>
    left + ((i + 0.5) / Math.max(1, visible.length)) * (right - left);
  const y = (price: number) =>
    top + ((ceiling - price) / (ceiling - floor)) * (priceBottom - top);
  const line = visible
    .map(
      (point, i) =>
        `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(point.close).toFixed(2)}`,
    )
    .join(" ");
  const movement =
    visible.length > 1 ? visible.at(-1)!.close - visible[0].close : 0;
  const color =
    movement === 0 ? COLORS.neutral : movement > 0 ? COLORS.up : COLORS.down;
  const candleWidth = Math.max(
    0.8,
    Math.min(16, ((right - left) / Math.max(1, visible.length)) * 0.66),
  );
  const zoom = (factor: number) => {
    const next = Math.min(
      points.length,
      Math.max(Math.min(8, points.length), Math.round(count * factor)),
    );
    setSize(next);
    setStart(
      Math.max(0, Math.min(points.length - next, offset + count - next)),
    );
    setHover(null);
  };
  if (!visible.length)
    return (
      <p className="py-16 text-center text-sm text-muted">
        No usable price observations available.
      </p>
    );
  const highIndex = highs.indexOf(high),
    lowIndex = lows.indexOf(low);
  return (
    <div className="space-y-3 min-w-0">
      <div
        className="flex flex-wrap justify-between gap-2 text-[11px] text-muted min-h-8"
        aria-live="polite"
        aria-atomic="true"
      >
        <span>
          {selected
            ? `${pointDate(selected.date, true)} IST`
            : "Hover or use arrow keys"}
        </span>
        {selected && (
          <span className="flex flex-wrap gap-x-3 tabular-nums">
            <span>O {priceText(selected.open)}</span>
            <span>H {priceText(selected.high)}</span>
            <span>L {priceText(selected.low)}</span>
            <strong className="text-foreground">
              C {priceText(selected.close)}
            </strong>
            <span>
              Vol{" "}
              {finite(selected.volume) && selected.volume >= 0
                ? compactVolume(selected.volume)
                : "Unavailable"}
            </span>
          </span>
        )}
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={`w-full ${volumeOnly ? "h-52 sm:h-64" : "h-72 sm:h-[420px]"} text-muted touch-pan-y cursor-crosshair select-none`}
        role="graphics-document"
        aria-label={`${mode === "candles" ? "OHLC candlestick" : "Price"} chart with ${visible.length} actual observations${hasVolume ? " and aligned provider volume" : ""}. Arrow keys inspect observations; zoom buttons and timeline slider change the view.`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setHover((previous) =>
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? visible.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        visible.length - 1,
                        (previous ?? visible.length - 1) +
                          (event.key === "ArrowLeft" ? -1 : 1),
                      ),
                    ),
            );
          }
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && count < points.length) {
            drag.current = { x: event.clientX, start: offset };
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (drag.current) {
            const delta = Math.round(
              ((drag.current.x - event.clientX) / rect.width) * count,
            );
            setStart(
              Math.max(
                0,
                Math.min(points.length - count, drag.current.start + delta),
              ),
            );
          } else {
            setHover(
              Math.max(
                0,
                Math.min(
                  visible.length - 1,
                  Math.floor(
                    ((((event.clientX - rect.left) / rect.width) * width -
                      left) /
                      (right - left)) *
                      visible.length,
                  ),
                ),
              ),
            );
          }
        }}
        onPointerLeave={() => {
          if (!drag.current) setHover(null);
        }}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {!volumeOnly &&
          Array.from({ length: 5 }, (_, i) => {
            const value = floor + ((ceiling - floor) * i) / 4;
            return (
              <g key={i}>
                <line
                  x1={left}
                  x2={right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="currentColor"
                  opacity="0.12"
                  strokeDasharray="4 4"
                />
                <text
                  x={right + 12}
                  y={y(value) + 4}
                  fill="currentColor"
                  fontSize="12"
                >
                  {priceText(value)}
                </text>
              </g>
            );
          })}
        {!volumeOnly && mode !== "candles" && (
          <>
            {mode === "area" && (
              <path
                d={`${line} L${x(visible.length - 1)},${priceBottom} L${x(0)},${priceBottom} Z`}
                fill={`url(#${gradient})`}
              />
            )}
            <path
              d={line}
              stroke={color}
              fill="none"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        {!volumeOnly &&
          mode === "candles" &&
          visible.map((point, i) =>
            validOHLC(point) ? (
              <g
                key={point.timestamp}
                data-candle="true"
                data-direction={volumeDirection(point)}
              >
                <title>{`${pointDate(point.date, true)}: Open ${point.open}, High ${point.high}, Low ${point.low}, Close ${point.close}`}</title>
                <line
                  x1={x(i)}
                  x2={x(i)}
                  y1={y(point.high!)}
                  y2={y(point.low!)}
                  stroke={COLORS[volumeDirection(point)]}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={x(i) - candleWidth / 2}
                  y={y(Math.max(point.open!, point.close))}
                  width={candleWidth}
                  height={Math.max(
                    1,
                    Math.abs(y(point.open!) - y(point.close)),
                  )}
                  fill={COLORS[volumeDirection(point)]}
                />
              </g>
            ) : null,
          )}
        {!volumeOnly &&
          overlays.map((overlay) => {
            let continuing = false;
            const path = study.indicators[overlay]
              .slice(offset, offset + count)
              .map((value, i) => {
                if (!finite(value)) {
                  continuing = false;
                  return "";
                }
                const segment = `${continuing ? "L" : "M"}${x(i)},${y(value)}`;
                continuing = true;
                return segment;
              })
              .join(" ");
            return (
              <path
                key={overlay}
                d={path}
                stroke={OVERLAYS[overlay]}
                strokeWidth="1.5"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        {!volumeOnly && (
          <>
            <text
              x={Math.max(
                72,
                Math.min(
                  right - 55,
                  x(Math.min(highIndex, visible.length - 1)),
                ),
              )}
              y={Math.max(16, y(high) - 8)}
              textAnchor="middle"
              fill="currentColor"
              fontSize="11"
            >
              High {priceText(high)}
            </text>
            <text
              x={Math.max(
                72,
                Math.min(right - 55, x(Math.min(lowIndex, visible.length - 1))),
              )}
              y={Math.min(priceBottom + 17, y(low) + 16)}
              textAnchor="middle"
              fill="currentColor"
              fontSize="11"
            >
              Low {priceText(low)}
            </text>
          </>
        )}
        {hasVolume && (
          <>
            <line
              x1={left}
              x2={right}
              y1={volumeTop}
              y2={volumeTop}
              stroke="currentColor"
              opacity="0.15"
            />
            <text
              x={left + 2}
              y={volumeTop - 8}
              fill="currentColor"
              fontSize="11"
            >
              Provider volume · {interval} observations
            </text>
            <text
              x={right + 12}
              y={volumeTop + 8}
              fill="currentColor"
              fontSize="11"
            >
              {compactVolume(
                maxVolume === 1 && visible.every((p) => !p.volume)
                  ? 0
                  : maxVolume,
              )}
            </text>
            {visible.map((point, i) =>
              finite(point.volume) && point.volume >= 0 ? (
                <rect
                  key={point.timestamp}
                  data-volume-direction={volumeDirection(point)}
                  x={x(i) - candleWidth / 2}
                  y={
                    bottom -
                    (point.volume / maxVolume) * (bottom - volumeTop - 10)
                  }
                  width={candleWidth}
                  height={
                    (point.volume / maxVolume) * (bottom - volumeTop - 10)
                  }
                  fill={COLORS[volumeDirection(point)]}
                  opacity="0.8"
                >
                  <title>{`${pointDate(point.date, true)} · Volume ${point.volume.toLocaleString("en-IN")} · ${volumeDirection(point)}`}</title>
                </rect>
              ) : null,
            )}
          </>
        )}
        {hover !== null && selected && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={top}
              y2={bottom}
              stroke="currentColor"
              opacity="0.7"
              strokeDasharray="4 3"
            />
            {!volumeOnly && (
              <>
                <line
                  x1={left}
                  x2={right}
                  y1={y(selected.close)}
                  y2={y(selected.close)}
                  stroke="currentColor"
                  opacity="0.4"
                  strokeDasharray="4 3"
                />
                <circle
                  cx={x(hover)}
                  cy={y(selected.close)}
                  r="4"
                  fill={color}
                  stroke="rgb(var(--surface))"
                  strokeWidth="2"
                />
              </>
            )}
          </g>
        )}
        {Array.from(
          new Set(
            Array.from({ length: tickCount }, (_, i) =>
              Math.round(((visible.length - 1) * i) / (tickCount - 1)),
            ),
          ),
        ).map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 6}
            textAnchor={
              i === 0 ? "start" : i === visible.length - 1 ? "end" : "middle"
            }
            fill="currentColor"
            fontSize="11"
          >
            {axisDate(visible[i].date)}
          </text>
        ))}
      </svg>
      {!hasVolume && (
        <p className="text-xs text-muted">
          Volume unavailable for these observations. No substitute bars are
          generated.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-[11px] text-muted">
          Showing {visible.length} of {points.length} observations · green up /
          red down / grey unknown or unchanged
        </span>
        <div className="flex items-center gap-1">
          <button
            className="research-icon-button"
            type="button"
            aria-label="Zoom in chart"
            disabled={count <= Math.min(8, points.length)}
            onClick={() => zoom(0.6)}
          >
            <Plus size={16} />
          </button>
          <button
            className="research-icon-button"
            type="button"
            aria-label="Zoom out chart"
            disabled={count === points.length}
            onClick={() => zoom(1.6)}
          >
            <Minus size={16} />
          </button>
          <button
            className="research-icon-button"
            type="button"
            aria-label="Reset chart zoom"
            onClick={() => {
              setSize(null);
              setStart(0);
              setHover(null);
            }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      {count < points.length && (
        <label className="flex items-center gap-3 text-xs text-muted">
          Pan timeline
          <input
            type="range"
            min={0}
            max={points.length - count}
            value={offset}
            aria-label="Chart timeline position"
            onChange={(event) => setStart(Number(event.target.value))}
            className="flex-1 min-w-0 accent-sky-500"
          />
        </label>
      )}
    </div>
  );
}
