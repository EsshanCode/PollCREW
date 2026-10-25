// Original Snug artwork: a friendly chest clip, the part parents most often get wrong.
const INK = "#1f2350";
const BUCKLE = "#ffc93c";

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="13"
        fill={BUCKLE}
        stroke={INK}
        strokeWidth="3.5"
      />
      <path d="M17 3 L17 45 M31 3 L31 45" stroke={INK} strokeWidth="6" />
      <rect
        x="10"
        y="18"
        width="28"
        height="12"
        rx="4"
        fill="#fff"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M24 18 V30" stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}

export function Mascot({
  size = 160,
  happy = true,
}: {
  size?: number;
  happy?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Snug mascot, a smiling chest clip"
      className="mascot"
    >
      <ellipse cx="100" cy="186" rx="58" ry="8" fill={INK} opacity="0.12" />
      <path
        d="M70 0 L78 70 M130 0 L122 70 M78 132 L70 200 M122 132 L130 200"
        stroke={INK}
        strokeWidth="26"
      />
      <path
        d="M70 0 L78 70 M130 0 L122 70 M78 132 L70 200 M122 132 L130 200"
        stroke="#3b3f73"
        strokeWidth="18"
      />
      <rect
        x="28"
        y="62"
        width="144"
        height="78"
        rx="24"
        fill={BUCKLE}
        stroke={INK}
        strokeWidth="6"
      />
      <path d="M100 66 V136" stroke={INK} strokeWidth="4" opacity="0.35" />
      <circle cx="74" cy="96" r="8" fill={INK} />
      <circle cx="126" cy="96" r="8" fill={INK} />
      <circle cx="76" cy="93" r="2.6" fill="#fff" />
      <circle cx="128" cy="93" r="2.6" fill="#fff" />
      <path
        d={happy ? "M84 114 Q100 128 116 114" : "M86 122 Q100 112 114 122"}
        fill="none"
        stroke={INK}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="58" cy="114" r="7" fill="#f08c8c" opacity="0.5" />
      <circle cx="142" cy="114" r="7" fill="#f08c8c" opacity="0.5" />
    </svg>
  );
}
