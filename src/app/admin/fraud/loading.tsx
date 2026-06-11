export default function FraudLoading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="dash-skeleton h-10 w-48 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-20 rounded-xl" />)}
      </div>
      <div className="dash-skeleton h-12 rounded-xl" />
      <div className="space-y-3">
        {[1,2,3,4,5,6].map(i => <div key={i} className="dash-skeleton h-16 rounded-xl" />)}
      </div>
    </div>
  );
}
