export default function Loading() {
  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="space-y-2">
        <div className="dash-skeleton h-7 w-32 rounded-lg" />
        <div className="dash-skeleton h-4 w-28 rounded" />
      </div>
      <div className="dash-skeleton h-40 rounded-2xl" />
      <div className="dash-skeleton h-16 rounded-xl" />
      <div className="dash-skeleton h-64 rounded-xl" />
    </div>
  );
}
