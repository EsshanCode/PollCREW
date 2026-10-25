// Original Blind Ballot artwork: a friendly ballot box (with an optional blindfold) and a star logo.
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
}: {
  cx: number;
  cy: number;
  r: number;
  fill?: string;
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
      stroke={NAVY}
      strokeWidth={Math.max(2, r / 5)}
      strokeLinejoin="round"
    />
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="12"
        fill={RED}
        stroke="#fff"
        strokeWidth="3"
      />
      <Star cx={24} cy={25} r={13} fill="#fff" />
    </svg>
  );
}
