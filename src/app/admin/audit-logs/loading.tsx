export default function AuditLogsLoading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="dash-skeleton h-10 w-48 rounded-xl" />
      <div className="dash-skeleton h-12 rounded-xl" />
      <div className="space-y-2">
        {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="dash-skeleton h-14 rounded-xl" />)}
      </div>
      <div className="dash-skeleton h-10 w-64 rounded-xl mx-auto" />
    </div>
  );
}
