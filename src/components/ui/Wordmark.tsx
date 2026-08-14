// The "CROPIFY" wordmark from the approved brand reference — the dot on
// the "i" is replaced by a small leaf. Built as real text (not a static
// SVG string) so it always renders in the actual brand font at whatever
// size/color context it's placed in; the leaf glyph is sized and
// positioned in em units so it scales and stays aligned with the
// surrounding letters at any font-size, rather than being pinned to
// pixel coordinates tuned for one specific size.
export function Wordmark({
  color = '#0A5C36',
  leafColor = '#34A853',
  style,
}: {
  color?: string;
  leafColor?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontFamily: 'var(--font-poppins), system-ui, sans-serif',
        fontWeight: 900,
        letterSpacing: '-0.03em',
        color,
        ...style,
      }}
    >
      CROP
      <span style={{ position: 'relative', display: 'inline-block', width: '0.32em' }}>
        {/* "i" stem — no dot, the leaf below takes its place */}
        <span
          style={{
            position: 'absolute', left: '0.09em', bottom: 0,
            width: '0.14em', height: '0.56em', borderRadius: '0.07em',
            background: color,
          }}
        />
        <svg
          viewBox="0 0 24 24"
          style={{ position: 'absolute', left: '-0.02em', bottom: '0.62em', width: '0.4em', height: '0.4em' }}
          aria-hidden="true"
        >
          <path d="M4,21 Q5,6 21,3 Q17,16 4,21 Z" fill={leafColor} />
        </svg>
      </span>
      FY
    </span>
  );
}
