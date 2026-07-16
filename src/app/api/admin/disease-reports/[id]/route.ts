import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

const STATUS_MSG: Record<string, string> = {
  assigned:  'A crop pathologist has been assigned to your case.',
  diagnosed: 'Your crop pathologist has completed a diagnosis. Check your report for details.',
  closed:    'Your disease report has been closed.',
};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Unauthorized', status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((profile as any)?.role !== 'admin') return { ok: false as const, error: 'Admin only', status: 403 };
  return { ok: true as const, supabase };
}

const VALID_STATUSES = ['reported', 'assigned', 'diagnosed', 'closed'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const { status, pathologistId } = await req.json();

  const update: Record<string, unknown> = {};
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    update.status = status;
  }
  if (pathologistId !== undefined) update.pathologist_id = pathologistId || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data: report } = await (auth.supabase.from as any)('disease_reports').select('farmer_id, crop_type').eq('id', id).single();

  const { error } = await (auth.supabase.from as any)('disease_reports').update(update).eq('id', id);
  if (error) {
    console.error('[/api/admin/disease-reports/[id]]', error);
    return NextResponse.json({ error: 'Failed to update disease report. Please try again.' }, { status: 500 });
  }

  if (status !== undefined && STATUS_MSG[status] && report?.farmer_id) {
    const { data: fp } = await (auth.supabase.from as any)('profiles').select('user_id').eq('id', report.farmer_id).single();
    if (fp?.user_id) {
      await notifyUser(auth.supabase, {
        userId: fp.user_id,
        role:   'farmer',
        type:   'disease',
        title:  `Disease report update — ${report.crop_type ?? 'your crop'}`,
        body:   STATUS_MSG[status],
        data:   { disease_report_id: id, status },
        url:    '/farmer/doctor',
      });
    }
  }

  return NextResponse.json({ success: true });
}
