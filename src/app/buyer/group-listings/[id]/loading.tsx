export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="dash-skeleton" style={{ height: 24, borderRadius: 8, width: 120 }} />
      <div className="dash-skeleton" style={{ height: 320, borderRadius: 18 }} />
      <div className="dash-skeleton" style={{ height: 240, borderRadius: 16 }} />
    </div>
  );
}
