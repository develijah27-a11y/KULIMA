import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DeleteMemberButton } from './DeleteMemberButton';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};

const ROLE_LABEL: Record<string, string> = { admin: 'Leader', member: 'Member', treasurer: 'Treasurer', secretary: 'Secretary' };

export default async function GroupMembersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: members } = await (supabase.from as any)('group_members')
    .select('id, full_name, phone_number, district, role, joined_at, contribution_total, farmer_id')
    .eq('admin_id', user.id)
    .order('role')
    .order('full_name')
    .limit(100);

  const rows = (members ?? []) as any[];
  const admins = rows.filter((m: any) => m.role === 'admin' || m.role === 'treasurer' || m.role === 'secretary');
  const regular = rows.filter((m: any) => m.role === 'member' || !m.role);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Members</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>{rows.length} member{rows.length !== 1 ? 's' : ''} in your group</p>
        </div>
        <Link href="/groups/members/add" style={{ padding: '8px 16px', background: C.greenMed, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + Add Member
        </Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No members yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Add your group members to start pooling resources and accessing group deals.</p>
          <Link href="/groups/members/add" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: C.greenMed, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Add First Member →
          </Link>
        </div>
      ) : (
        <>
          {admins.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Leadership</p>
              <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
                {admins.map((m: any, i: number) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < admins.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: C.green, flexShrink: 0 }}>
                      {m.full_name?.[0]?.toUpperCase() ?? 'M'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{m.full_name ?? 'Member'}</p>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{m.district} · {m.phone_number ?? 'No phone'}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'var(--color-primary-bg)', color: C.greenMed }}>{ROLE_LABEL[m.role] ?? m.role}</span>
                    <DeleteMemberButton memberId={m.id} memberName={m.full_name ?? 'Member'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {regular.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Members ({regular.length})</p>
              <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
                {regular.map((m: any, i: number) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < regular.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.muted, flexShrink: 0 }}>
                      {m.full_name?.[0]?.toUpperCase() ?? 'M'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{m.full_name ?? 'Member'}</p>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                          background: m.farmer_id ? 'var(--color-success-bg)' : 'var(--color-surface-2)',
                          color: m.farmer_id ? 'var(--color-success)' : C.muted,
                        }}>
                          {m.farmer_id ? 'On Cropify' : 'Not on app'}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{m.district} · Joined {new Date(m.joined_at ?? Date.now()).toLocaleDateString('en-UG', { month: 'short', year: 'numeric' })}</p>
                    </div>
                    {m.contribution_total > 0 && (
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.greenMed, margin: 0 }}>UGX {(m.contribution_total ?? 0).toLocaleString()}</p>
                    )}
                    <DeleteMemberButton memberId={m.id} memberName={m.full_name ?? 'Member'} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
