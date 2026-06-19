export default function Loading() {
  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="dash-skeleton h-10 w-64 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[1,2,3,4,5].map(i => <div key={i} className="dash-skeleton h-20 rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="dash-skeleton h-40 rounded-xl" />
        <div className="dash-skeleton h-40 rounded-xl" />
      </div>
      <div className="dash-skeleton h-96 rounded-xl" />
    </div>
  );
}
