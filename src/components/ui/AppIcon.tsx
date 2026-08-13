// The Cropify mark — a "C" ring wrapping a genuine 8-point sunburst over
// layered field terracing, with a two-tone leaf overlapping the ring's
// lower terminus — kept as one inline SVG component so every place that
// shows the app's logo (sidebar, sign-in, landing nav/footer, mobile
// drawer) stays in sync. No background rect: this is the mark alone, meant
// to sit on whatever surface it's placed against (dark sidebar, glass auth
// card, light landing page). The version with a white background lives
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
        <linearGradient id="appIconRingGrad" x1="128" y1="40" x2="195" y2="185" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0A5C36" />
          <stop offset="0.55" stopColor="#34A853" />
          <stop offset="1" stopColor="#8BC34A" />
        </linearGradient>
        <linearGradient id="appIconLeafGrad" x1="192" y1="170" x2="242" y2="228" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0A5C36" />
          <stop offset="1" stopColor="#8BC34A" />
        </linearGradient>
      </defs>
      <path d="M195.4,184.6 A88,88 0 1 1 195.4,71.4" stroke="url(#appIconRingGrad)" strokeWidth="46" strokeLinecap="round" />
      <circle cx="115" cy="110" r="30" fill="#FFB300" />
      <path d="M115,74 L120.7,96.1 L140.5,84.5 L128.9,104.3 L151,110 L128.9,115.7 L140.5,135.5 L120.7,123.9 L115,146 L109.3,123.9 L89.5,135.5 L101.1,115.7 L79,110 L101.1,104.3 L89.5,84.5 L109.3,96.1 Z" fill="#FFFFFF" />
      <path d="M45,178 Q90,148 130,165 Q155,151 180,164 Q188,168 185,178 L185,202 L45,202 Z" fill="#34A853" />
      <path d="M45,188 Q85,163 125,178 Q150,166 175,177 Q184,182 180,190 L180,206 L45,206 Z" fill="#8BC34A" />
      <path d="M193,172 Q195,214 242,226 Q239,182 193,172 Z" fill="url(#appIconLeafGrad)" />
      <path d="M197,178 Q210,198 236,220" stroke="#F4FBF6" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={0.85} />
      <path d="M206,190 L216,186" stroke="#F4FBF6" strokeWidth="2" strokeLinecap="round" opacity={0.7} />
      <path d="M216,202 L227,200" stroke="#F4FBF6" strokeWidth="2" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}
