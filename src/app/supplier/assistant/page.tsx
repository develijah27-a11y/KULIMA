import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CopilotChat } from '@/components/copilot/CopilotChat';

export default async function SupplierAssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--d-text)', letterSpacing: '-0.03em', marginBottom: 4 }}>Copilot</h1>
        <p style={{ fontSize: 13, color: 'var(--d-muted)' }}>Ask about your listing status or recent market prices to help set your own.</p>
      </div>
      <CopilotChat role="agro_dealer" />
    </div>
  );
}
