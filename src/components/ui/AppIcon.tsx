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
      <path d="M74,176 Q128,158 182,176 L182,190 Q128,174 74,190 Z" fill="#8BC34A" />
      <circle cx="128" cy="132" r="15" fill="#FFB300" />
      <g stroke="#FFB300" strokeWidth="5" strokeLinecap="round">
        <path d="M128,100 L128,110" />
        <path d="M101,113 L109,119" />
        <path d="M155,113 L147,119" />
        <path d="M96,140 L106,138" />
        <path d="M160,140 L150,138" />
      </g>
      <path d="M180.8,165.6 A64,64 0 1 1 180.8,90.4" stroke="#34A853" strokeWidth="32" strokeLinecap="round" />
      <path d="M180.8,90.4 Q168,66 198,52 Q194,82 180.8,90.4 Z" fill="#0A5C36" />
    </svg>
  );
}
