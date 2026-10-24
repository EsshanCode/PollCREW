"use client";
import { useEffect, useRef } from "react";
import { Simulation } from "./types";
export default function RiskChart({ simulation }: { simulation: Simulation }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const element = ref.current;
    import("plotly.js-dist-min").then((Plotly) => {
      if (!active || !element) return;
      Plotly.newPlot(
        element,
        [
          {
            type: "bar",
            x: simulation.locations.map((l) =>
              l.name
                .replace("Community Center", "Center")
                .replace("Learning Center", "Learning"),
            ),
            y: simulation.locations.map((l) => l.risk_percent),
            marker: {
              color: simulation.locations.map((l) =>
                l.risk_percent > 30 ? "#c8243b" : "#1d2b53",
              ),
            },
            hovertemplate: "%{x}<br>%{y:.2f}% of scenarios<extra></extra>",
          },
        ],
        {
          height: 250,
          margin: { t: 10, b: 60, l: 42, r: 15 },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          yaxis: {
            range: [
              0,
              Math.min(
                100,
                Math.max(
                  5,
                  ...simulation.locations.map((l) => l.risk_percent * 1.3),
                ),
              ),
            ],
            ticksuffix: "%",
            gridcolor: "#e3e9f5",
          },
          font: {
            family: "Atkinson Hyperlegible, Arial",
            size: 12,
            color: "#4a5578",
          },
        },
        { responsive: true, displayModeBar: false },
      );
    });
    return () => {
      active = false;
      if (element) import("plotly.js-dist-min").then((p) => p.purge(element));
    };
  }, [simulation]);
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Risk by location. Exact values appear in the location list."
    />
  );
}
