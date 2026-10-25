// Original Blind Ballot artwork: a friendly ballot box (with an optional blindfold) and a flag-globe logo.
import { useId } from "react";

const NAVY = "#1D2B53";
const RED = "#C8243B";
const GOLD = "#F2B632";

export function Mascot({
  size = 160,
  wave = false,
  blindfold = false,
}: {
  size?: number;
  wave?: boolean;
  blindfold?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={
        blindfold
          ? "Blind Ballot mascot, a smiling ballot box wearing a blindfold"
          : "Blind Ballot mascot, a smiling ballot box"
      }
      className={wave ? "mascot mascot-wave" : "mascot"}
    >
      <ellipse cx="100" cy="186" rx="62" ry="8" fill={NAVY} opacity="0.12" />
      {/* ballot going in */}
      <g className="mascot-ballot">
        <rect
          x="74"
          y="14"
          width="52"
          height="60"
          rx="5"
          fill="#fff"
          stroke={NAVY}
          strokeWidth="5"
        />
        <path
          d="M86 44 l9 9 l18 -20"
          fill="none"
          stroke={RED}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* lid */}
      <rect
        x="34"
        y="60"
        width="132"
        height="26"
        rx="9"
        fill={NAVY}
        stroke={NAVY}
        strokeWidth="5"
      />
      <rect x="70" y="69" width="60" height="8" rx="4" fill="#0d1631" />
      {/* body */}
      <rect
        x="42"
        y="84"
        width="116"
        height="94"
        rx="14"
        fill="#fff"
        stroke={NAVY}
        strokeWidth="5"
      />
      <rect x="44" y="140" width="112" height="12" fill={RED} />
      <rect x="44" y="158" width="112" height="9" fill={RED} opacity="0.9" />
      {/* face */}
      <circle cx="80" cy="108" r="6" fill={NAVY} />
      <circle cx="120" cy="108" r="6" fill={NAVY} />
      <circle cx="82" cy="106" r="2" fill="#fff" />
      <circle cx="122" cy="106" r="2" fill="#fff" />
      <path
        d="M86 120 q14 12 28 0"
        fill="none"
        stroke={NAVY}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {blindfold && (
        <g>
          <rect x="44" y="96" width="112" height="24" rx="9" fill={NAVY} />
          <path
            d="M156 104 l18 -10 M156 112 l20 6"
            stroke={NAVY}
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>
      )}
      <circle cx="68" cy="122" r="6" fill={RED} opacity="0.25" />
      <circle cx="132" cy="122" r="6" fill={RED} opacity="0.25" />
      {/* arm with star */}
      <g className="mascot-arm">
        <path
          d="M158 118 q22 -8 26 -32"
          fill="none"
          stroke={NAVY}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Star cx={184} cy={78} r={14} />
      </g>
      <path
        d="M42 122 q-18 6 -20 24"
        fill="none"
        stroke={NAVY}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Star({
  cx,
  cy,
  r,
  fill = GOLD,
  stroke = NAVY,
}: {
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  stroke?: string;
}) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  }).join(" ");
  return (
    <polygon
      points={points}
      fill={fill}
      stroke={stroke}
      strokeWidth={Math.max(2, r / 5)}
      strokeLinejoin="round"
    />
  );
}

// Cartoon desk globe painted as the U.S. flag. Same artwork as app/icon.svg (the favicon).
export function LogoMark({
  size = 40,
  onDark = false,
}: {
  size?: number;
  onDark?: boolean;
}) {
  const line = onDark ? "#fff" : NAVY;
  const clip = `globe-${useId().replace(/:/g, "")}`;
  const stars: [number, number][] = [
    [15, 9.5],
    [21, 9.5],
    [12, 15],
    [18, 15],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <circle cx="24" cy="21" r="16" />
        </clipPath>
      </defs>
      <path
        d="M10 35 A19.8 19.8 0 0 0 38 7"
        fill="none"
        stroke={GOLD}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M24 40 V43"
        stroke={line}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <rect x="14" y="42.2" width="20" height="4" rx="2" fill={line} />
      <g clipPath={`url(#${clip})`}>
        <rect x="6" y="3" width="36" height="36" fill="#fff" />
        {[5.6, 14, 22.4, 30.8].map((y) => (
          <rect key={y} x="6" y={y} width="36" height="4.2" fill={RED} />
        ))}
        <rect x="6" y="3" width="19" height="17.8" fill={NAVY} />
        {stars.map(([x, y]) => (
          <Star
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={2.8}
            fill="#fff"
            stroke="none"
          />
        ))}
        <ellipse
          cx="24"
          cy="21"
          rx="7"
          ry="16"
          fill="none"
          stroke={NAVY}
          strokeWidth="1.2"
          opacity="0.28"
        />
        <path
          d="M29.5 8 A13.5 13.5 0 0 1 36 15.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
      <circle
        cx="24"
        cy="21"
        r="16"
        fill="none"
        stroke={line}
        strokeWidth="3"
      />
    </svg>
  );
}
