export default function DoctorLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="space-y-2">
        <div className="dash-skeleton h-7 w-52 rounded-lg" />
        <div className="dash-skeleton h-4 w-80 rounded-lg" />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="dash-skeleton h-96 rounded-xl" />
        <div className="dash-skeleton h-96 rounded-xl" />
      </div>
      <div className="dash-skeleton h-48 rounded-xl" />
    </div>
  );
}
