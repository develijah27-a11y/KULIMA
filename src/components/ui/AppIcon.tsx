// The Cropify mark — a "C" ring wrapping a genuine 8-point sunburst over
// three layered field-terrace bands, with a leaf split into two flat-color
// halves along its center vein overlapping the ring's lower terminus —
// kept as one inline SVG component so every place that shows the app's
// logo (sidebar, sign-in, landing nav/footer, mobile drawer) stays in
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
        <linearGradient id="appIconRingGrad" x1="128" y1="40" x2="195" y2="185" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0A5C36" />
          <stop offset="0.55" stopColor="#34A853" />
          <stop offset="1" stopColor="#8BC34A" />
        </linearGradient>
      </defs>
      <path d="M195.4,184.6 A88,88 0 1 1 195.4,71.4" stroke="url(#appIconRingGrad)" strokeWidth="46" strokeLinecap="round" />
      <circle cx="115" cy="110" r="30" fill="#FFB300" />
      <path d="M115,74 L120.7,96.1 L140.5,84.5 L128.9,104.3 L151,110 L128.9,115.7 L140.5,135.5 L120.7,123.9 L115,146 L109.3,123.9 L89.5,135.5 L101.1,115.7 L79,110 L101.1,104.3 L89.5,84.5 L109.3,96.1 Z" fill="#FFFFFF" />
      <path d="M45,170 Q88,142 128,158 Q152,146 178,157 Q186,161 183,170 L183,202 L45,202 Z" fill="#0A5C36" />
      <path d="M45,180 Q90,150 130,167 Q155,153 180,166 Q188,170 185,180 L185,204 L45,204 Z" fill="#34A853" />
      <path d="M45,190 Q85,165 125,180 Q150,168 175,179 Q184,184 180,192 L180,208 L45,208 Z" fill="#8BC34A" />
      <path d="M193,172 Q195,214 242,226 Q217,198 193,172 Z" fill="#8BC34A" />
      <path d="M193,172 Q217,198 242,226 Q239,182 193,172 Z" fill="#0A5C36" />
      <path d="M193,172 Q217,198 242,226" stroke="#F4FBF6" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={0.9} />
      <path d="M204,188 L214,183" stroke="#F4FBF6" strokeWidth="1.8" strokeLinecap="round" opacity={0.7} />
      <path d="M215,201 L226,198" stroke="#F4FBF6" strokeWidth="1.8" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}
