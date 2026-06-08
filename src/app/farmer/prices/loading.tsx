export default function PricesLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="dash-skeleton h-7 w-44 rounded-lg" />
          <div className="dash-skeleton h-4 w-56 rounded-lg" />
        </div>
        <div className="dash-skeleton h-10 w-36 rounded-xl" />
      </div>
      <div className="dash-skeleton h-20 rounded-xl" />
      <div className="dash-skeleton h-14 rounded-xl" />
      <div className="space-y-2">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="dash-skeleton h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
