import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CopilotChat } from '@/components/copilot/CopilotChat';

export default async function TransporterAssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--d-text)', letterSpacing: '-0.03em', marginBottom: 4 }}>Copilot</h1>
        <p style={{ fontSize: 13, color: 'var(--d-muted)' }}>Ask about your assignment status or a delivery's payment breakdown.</p>
      </div>
      <CopilotChat role="transporter" />
    </div>
  );
}
