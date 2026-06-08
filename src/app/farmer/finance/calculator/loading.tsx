export default function CalculatorLoading() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div className="space-y-4">
        <div className="dash-skeleton h-10 w-64 rounded-lg" />
        <div className="dash-skeleton h-48 rounded-2xl" />
        <div className="dash-skeleton h-64 rounded-2xl" />
        <div className="dash-skeleton h-40 rounded-2xl" />
      </div>
      <div className="dash-skeleton h-[600px] rounded-2xl" />
    </div>
  );
}
