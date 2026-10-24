"use client";
import { useEffect, useRef } from "react";
import { CurvePoint } from "./types";
export default function TradeoffChart({
  curve,
  budget,
}: {
  curve: CurvePoint[];
  budget: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const element = ref.current;
    import("plotly.js-dist-min").then((Plotly) => {
      if (!active || !element) return;
      const chosen = curve.find((p) => p.budget === budget);
      Plotly.newPlot(
        element,
        [
          {
            type: "scatter",
            mode: "lines+markers",
            name: "Even spread",
            x: curve.map((p) => p.budget),
            y: curve.map((p) => p.even_risk_percent),
            line: { color: "#cf792c", width: 2, dash: "dot" },
            marker: { size: 6 },
            hovertemplate:
              "%{x} extra workers<br>Even spread: %{y:.1f}%<extra></extra>",
          },
          {
            type: "scatter",
            mode: "lines+markers",
            name: "PollCREW",
            x: curve.map((p) => p.budget),
            y: curve.map((p) => p.optimized_risk_percent),
            line: { color: "#087f75", width: 3 },
            marker: { size: 7 },
            hovertemplate:
              "%{x} extra workers<br>PollCREW: %{y:.1f}%<extra></extra>",
          },
          ...(chosen
            ? [
                {
                  type: "scatter" as const,
                  mode: "markers" as const,
                  name: "Your budget",
                  x: [chosen.budget],
                  y: [chosen.optimized_risk_percent],
                  marker: {
                    size: 14,
                    color: "rgba(0,0,0,0)",
                    line: { color: "#14213d", width: 2 },
                  },
                  hovertemplate: "Your budget<extra></extra>",
                },
              ]
            : []),
        ],
        {
          height: 280,
          margin: { t: 10, b: 48, l: 48, r: 15 },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          xaxis: {
            title: { text: "Extra check-in workers available" },
            dtick: 1,
            gridcolor: "#e7eceb",
          },
          yaxis: {
            title: { text: "Chance any site waits >30 min" },
            range: [0, 100],
            ticksuffix: "%",
            gridcolor: "#e7eceb",
          },
          legend: { orientation: "h", y: 1.12, x: 0 },
          font: { family: "Arial", size: 11, color: "#536477" },
        },
        { responsive: true, displayModeBar: false },
      );
    });
    return () => {
      active = false;
      if (element) import("plotly.js-dist-min").then((p) => p.purge(element));
    };
  }, [curve, budget]);
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Line risk by extra-staff budget for PollCREW and an even spread. Exact values appear in the table below."
    />
  );
}
