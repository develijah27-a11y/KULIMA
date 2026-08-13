// The Cropify mark — a "C" formed by a leaf wrapping a rising sun over a
// field — kept as one inline SVG component so every place that shows the
// app's logo (sidebar, sign-in, landing nav/footer, mobile drawer) stays in
// sync. No background rect: this is the mark alone, meant to sit on
// whatever surface it's placed against (dark sidebar, glass auth card,
// light landing page). The version with a white background lives
// separately at public/icons/icon.svg, for the favicon/home-screen icon
// slot. Update both together if the mark ever changes.
export function AppIcon({ size = 28, rounded = 0 }: { size?: number; rounded?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: rounded, flexShrink: 0, display: 'block' }}
      aria-label="Cropify"
    >
      <defs>
        <linearGradient id="appIconRingGrad" x1="195" y1="71" x2="195" y2="185" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0A5C36" />
          <stop offset="1" stopColor="#34A853" />
        </linearGradient>
        <linearGradient id="appIconLeafGrad" x1="198" y1="178" x2="238" y2="222" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0A5C36" />
          <stop offset="1" stopColor="#8BC34A" />
        </linearGradient>
      </defs>
      <path d="M195.4,184.6 A88,88 0 1 1 195.4,71.4" stroke="url(#appIconRingGrad)" strokeWidth="46" strokeLinecap="round" />
      <path d="M198,178 Q198.8,217.5 238,222 Q237.2,182.5 198,178 Z" fill="url(#appIconLeafGrad)" />
      <path d="M198,178 L238,222" stroke="#0A5C36" strokeWidth="2" strokeLinecap="round" opacity={0.5} />
      <g stroke="#FFB300" strokeWidth="7" strokeLinecap="round">
        <path d="M132,112 L148,112" />
        <path d="M125,129 L136.3,140.3" />
        <path d="M108,136 L108,152" />
        <path d="M91,129 L79.7,140.3" />
        <path d="M84,112 L68,112" />
        <path d="M91,95 L79.7,83.7" />
        <path d="M108,88 L108,72" />
        <path d="M125,95 L136.3,83.7" />
      </g>
      <circle cx="108" cy="112" r="19" fill="#FFB300" />
      <path d="M50,178 Q92,148 130,166 Q152,153 176,166 L176,196 L50,196 Z" fill="#8BC34A" />
    </svg>
  );
}
