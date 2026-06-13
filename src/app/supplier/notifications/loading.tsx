export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="space-y-2">
        <div className="dash-skeleton h-7 w-36 rounded-lg" />
        <div className="dash-skeleton h-4 w-28 rounded" />
      </div>
      <div className="dash-skeleton h-72 rounded-xl" />
    </div>
  );
}
