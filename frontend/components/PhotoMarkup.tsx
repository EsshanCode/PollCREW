"use client";
import { Item, Points, Pt, Result } from "@/lib/snug";

// The photo with Snug's marks drawn on top: numbered markers for each located check,
// plus the shoulder and armpit guide lines. Markers are HTML so they never distort.
export default function PhotoMarkup({
  src,
  result,
  points,
  onTap,
  cursor,
  label,
}: {
  src: string;
  result?: Result | null;
  points?: Points;
  onTap?: (p: Pt) => void;
  cursor?: boolean;
  label: string;
}) {
  const located = (result?.items ?? []).filter(
    (i): i is Item & { at: Pt } => i.group === "photo" && !!i.at,
  );
  const numbered = (result?.items ?? []).filter((i) => i.group === "photo");
  return (
    <div
      className={`photo${onTap ? " tappable" : ""}${cursor ? " crosshair" : ""}`}
      onClick={(e) => {
        if (!onTap) return;
        const box = e.currentTarget.getBoundingClientRect();
        onTap({
          x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
          y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
        });
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} draggable={false} />
      {result?.lines && (
        <>
          <span
            className="guide shoulder"
            style={{ top: `${result.lines.shoulder_y * 100}%` }}
          >
            <em>Shoulders</em>
          </span>
          <span
            className="guide armpit"
            style={{ top: `${result.lines.armpit_y * 100}%` }}
          >
            <em>Armpit level</em>
          </span>
        </>
      )}
      {points &&
        !result &&
        Object.entries(points).map(([name, p]) =>
          p ? (
            <span
              key={name}
              className="dot"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            />
          ) : null,
        )}
      {located.map((i) => (
        <span
          key={i.id}
          className={`marker ${i.status}`}
          style={{ left: `${i.at.x * 100}%`, top: `${i.at.y * 100}%` }}
          aria-label={`${numbered.indexOf(i) + 1}. ${i.title}: ${i.status}`}
        >
          {numbered.indexOf(i) + 1}
        </span>
      ))}
    </div>
  );
}
