export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="space-y-2">
        <div className="dash-skeleton h-7 w-32 rounded-lg" />
        <div className="dash-skeleton h-4 w-56 rounded" />
      </div>
      <div className="dash-skeleton h-72 rounded-2xl" />
      <div className="dash-skeleton h-28 rounded-xl" />
    </div>
  );
}
