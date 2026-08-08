// The Cropify mark — a leaf rising out of a sunrise — kept as one inline SVG
// component so every place that shows the app's icon (sidebar, sign-in,
// splash) stays in sync. Mirrors public/icons/icon.svg; update both if the
// mark ever changes.
export function AppIcon({ size = 28, rounded = 8 }: { size?: number; rounded?: number }) {
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
        <linearGradient id="appIconBg" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22A35C" />
          <stop offset="1" stopColor="#0B4020" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="56" fill="url(#appIconBg)" />
      <path d="M62,192 A66,66 0 0 1 194,192 Z" fill="#FFA726" />
      <path d="M96,182 Q88,104 202,66 Q166,152 96,182 Z" fill="#F6EFDD" />
      <path d="M110,168 Q140,120 190,80" stroke="#0B4020" strokeWidth="4" strokeLinecap="round" opacity="0.25" />
    </svg>
  );
}
