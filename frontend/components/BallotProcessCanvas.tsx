"use client";

import { useEffect, useRef } from "react";
import { DEMO_ANSWERS, DEMO_CANDIDATES, type Importance, type WalkthroughResult } from "@/lib/ballot-walkthrough";

export default function BallotProcessCanvas({ step, importance, result, summary }: {
  step: number;
  importance: Importance;
  result: WalkthroughResult;
  summary: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previous = useRef({ step, importance });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;
    const node = canvas;
    const root = node.closest("#bb-engine")!;
    const palette = getComputedStyle(root);
    const ink = palette.getPropertyValue("--navy").trim();
    const muted = palette.getPropertyValue("--muted").trim();
    const lineColor = palette.getPropertyValue("--line").trim();
    const paper = palette.getPropertyValue("--paper").trim();
    const colors = [palette.getPropertyValue("--red").trim(), ink, palette.getPropertyValue("--be-cyan").trim()];
    const { scores, counts, winners } = result;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let disposed = false;

    function draw(animate = false) {
      cancelAnimationFrame(frame);
      const { width: w, height: h } = node.getBoundingClientRect();
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      node.width = Math.round(w * dpr);
      node.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const compact = w < 420;
      const cx = w / 2;
      const cy = h * 0.38;
      const cloudHeight = compact ? 130 : 155;
      const start = performance.now();
      const duration = animate && !motion.matches ? 650 : 0;

      function text(value: string, x: number, y: number, size: number, color = ink, align: CanvasTextAlign = "center", font = "ui-monospace, monospace") {
        ctx.fillStyle = color;
        ctx.font = `${Math.max(11, size)}px ${font}`;
        ctx.textAlign = align;
        ctx.fillText(value, x, y);
      }
      function line(x1: number, y1: number, x2: number, y2: number, color = lineColor, width = 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      function dot(x: number, y: number, radius: number, color: string) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      function ring(x: number, y: number, radius: number, color: string, alpha = 1, width = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }

      function paint(now: number) {
        if (disposed) return;
        const progress = duration ? Math.min(1, (now - start) / duration) : 1;
        const eased = 1 - Math.pow(1 - progress, 3);
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.globalAlpha = 0.32;
        for (let x = 18; x < w; x += 28) {
          for (let y = 16; y < h - 70; y += 28) dot(x, y, 0.65, lineColor);
        }
        ctx.restore();

        if (step === 0) {
          const radius = compact ? 61 : 87;
          [radius, radius + 22, radius + 45].forEach((r, i) => ring(cx, cy, r, lineColor, 0.8 - i * 0.12));
          const labels = ["SCHOOLS", "TAX", "HOUSING"];
          DEMO_ANSWERS.forEach((answer, i) => {
            const angle = -Math.PI / 2 + i * 2 * Math.PI / 3;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            line(x, y, cx, cy, colors[i], 1.5);
            for (let j = 1; j <= 5; j++) {
              const t = Math.max(0, Math.min(1, eased - (5 - j) * 0.09));
              dot(x + (cx - x) * t, y + (cy - y) * t, 2, colors[i]);
            }
            dot(x, y, 21, paper);
            ring(x, y, 21, colors[i], 1, 1.5);
            text(`${answer > 0 ? "+" : ""}${answer}`, x, y + 6, 18, colors[i]);
            text(labels[i], x, y + (i === 0 ? -31 : 38), 11, muted);
          });
          dot(cx, cy, 22, paper);
          ring(cx, cy, 22, colors[0]);
          text("u", cx, cy + 7, 24, colors[0]);
        }

        if (step === 1) {
          const weights = [importance, 1, 1];
          const labels = ["SCHOOLS", "TAX", "HOUSING"];
          const span = compact ? w * 0.29 : w * 0.26;
          weights.forEach((weight, i) => {
            const x = cx + (i - 1) * span;
            const radius = (compact ? 17 : 24) + weight * (compact ? 7 : 11);
            ring(x, cy, radius + 10, lineColor, 0.7);
            ctx.save();
            ctx.globalAlpha = 0.09;
            dot(x, cy, radius * eased, colors[i]);
            ctx.restore();
            ctx.strokeStyle = colors[i];
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, cy, radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * weight / 3 * eased);
            ctx.stroke();
            text(`×${weight}`, x, cy + 7, compact ? 24 : 34, colors[i]);
            text(labels[i], x, cy + (compact ? 64 : 84), 11, muted);
            const share = `${(weight / (importance + 2) * 100).toFixed(0)}%`;
            text(compact ? share : `${share} of weight`, x, cy + (compact ? 84 : 104), 11, muted);
          });
        }

        if (step === 2) {
          const left = compact ? 20 : 60;
          const right = w - left;
          const trackLeft = compact ? 42 : 130;
          const trackWidth = right - trackLeft - 52;
          DEMO_CANDIDATES.forEach((candidate, i) => {
            const y = 49 + i * 62;
            text(String.fromCharCode(65 + i), left, y + 3, 20, colors[i]);
            let x = trackLeft;
            const weights = [importance, 1, 1];
            candidate.positions.forEach((position, j) => {
              const full = trackWidth * weights[j] / (importance + 2);
              const agreement = 1 - Math.abs(DEMO_ANSWERS[j] - position) / 4;
              ctx.globalAlpha = 0.12;
              ctx.fillStyle = colors[i];
              ctx.fillRect(x, y - 15, full - 4, 25);
              ctx.globalAlpha = 0.85;
              ctx.fillRect(x, y - 15, (full - 4) * agreement * eased, 25);
              ctx.globalAlpha = 1;
              x += full;
            });
            text(`${(scores[i] * 100).toFixed(1)}%`, right, y + 3, 12, ink, "right");
          });
        }

        if (step === 3) {
          const columns = compact ? 40 : 80;
          const rows = Math.ceil(winners.length / columns);
          const gapX = (w - 34) / columns;
          const gapY = cloudHeight / rows;
          const radius = Math.max(0.85, Math.min(gapX, gapY) * 0.35);
          winners.forEach((winner, n) => {
            const x = 17 + (n % columns + 0.5) * gapX;
            const y = 28 + Math.floor(n / columns) * gapY;
            const angle = n / winners.length * Math.PI * 16;
            const startX = cx + Math.cos(angle) * (compact ? 75 : 150);
            const startY = 100 + Math.sin(angle) * 60;
            dot(startX + (x - startX) * eased, startY + (y - startY) * eased, radius, colors[winner]);
          });
          const y = 28 + cloudHeight + 28;
          counts.forEach((count, i) => {
            const x = (i + 0.5) * w / 3;
            dot(x - (compact ? 24 : 37), y - 4, 3, colors[i]);
            text(`${String.fromCharCode(65 + i)} ${(count / winners.length * 100).toFixed(1)}%`, x + 5, y, compact ? 11 : 13);
            text(`${count} runs`, x, y + 18, 11, muted);
          });
        }

        if (step === 4) {
          const sorted = DEMO_CANDIDATES.map((candidate, i) => ({ ...candidate, i, score: scores[i] })).sort((a, b) => b.score - a.score);
          const best = sorted[0];
          const tied = sorted.filter((candidate) => Math.abs(candidate.score - best.score) < 1e-10);
          const radius = compact ? 68 : 83;
          ring(cx, cy, radius + 22, lineColor, 0.8);
          ring(cx, cy, radius + 8, lineColor, 0.4);
          ctx.strokeStyle = colors[best.i];
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * best.score * eased);
          ctx.stroke();
          text(tied.length > 1 ? "TIED MATCH" : "TOP MATCH", cx, cy - 20, 11, muted);
          text(tied.length > 1 ? `${tied[0].name} +` : "Fictional", cx, cy + 9, compact ? 22 : 27, ink, "center", "Fredoka, system-ui, sans-serif");
          text(tied.length > 1 ? tied[1].name : best.name, cx, cy + 36, compact ? 24 : 31, colors[best.i], "center", "Fredoka, system-ui, sans-serif");
        }
        if (progress < 1) frame = requestAnimationFrame(paint);
      }
      paint(start);
    }

    const changed = previous.current.step !== step || previous.current.importance !== importance;
    previous.current = { step, importance };
    draw(changed);
    // ResizeObserver's first notification must not cancel a just-started transition.
    const initialSize = node.getBoundingClientRect();
    let size = `${initialSize.width},${initialSize.height}`;
    const observer = new ResizeObserver(([entry]) => {
      const next = `${entry.contentRect.width},${entry.contentRect.height}`;
      if (next !== size) { size = next; draw(); }
    });
    observer.observe(node);
    const redraw = () => draw();
    motion.addEventListener("change", redraw);
    if (document.fonts.status !== "loaded") {
      document.fonts.ready.then(() => { if (!disposed) draw(); });
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", redraw);
    };
  }, [step, importance, result]);

  return <canvas ref={canvasRef} role="img" aria-label={summary} />;
}
