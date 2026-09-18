import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CopilotChat } from '@/components/copilot/CopilotChat';

export const metadata = {
  title: 'Cropify Copilot | Transporter Dispatch Assistant',
  description: 'View delivery assignments, itemized payouts, route details, and report transit delays.',
};

export default async function TransporterAssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto w-full h-[calc(100vh-110px)] md:h-[calc(100vh-130px)] min-h-[600px] flex flex-col">
      <header className="sr-only">
        <h1>Cropify Transporter Copilot — Logistics & Dispatch Assistant</h1>
      </header>
      <div className="flex-1 min-h-0 w-full flex flex-col">
        <CopilotChat role="transporter" />
      </div>
    </div>
  );
}
