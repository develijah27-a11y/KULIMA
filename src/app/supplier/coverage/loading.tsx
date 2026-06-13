export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="space-y-2">
        <div className="dash-skeleton h-7 w-44 rounded-lg" />
        <div className="dash-skeleton h-4 w-72 rounded" />
      </div>
      <div className="dash-skeleton h-24 rounded-xl" />
      <div className="dash-skeleton h-48 rounded-xl" />
      <div className="dash-skeleton h-56 rounded-xl" />
    </div>
  );
}
