export default function WeatherLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="dash-skeleton h-7 w-48 rounded-lg" />
          <div className="dash-skeleton h-4 w-64 rounded-lg" />
        </div>
        <div className="dash-skeleton h-10 w-40 rounded-xl" />
      </div>
      <div className="dash-skeleton h-40 rounded-xl" />
      <div className="grid md:grid-cols-2 gap-5">
        <div className="dash-skeleton h-52 rounded-xl" />
        <div className="dash-skeleton h-52 rounded-xl" />
      </div>
      <div className="dash-skeleton h-96 rounded-xl" />
      <div className="dash-skeleton h-48 rounded-xl" />
    </div>
  );
}
