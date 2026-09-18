import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CopilotChat } from '@/components/copilot/CopilotChat';

export const metadata = {
  title: 'Cropify Copilot | Buyer Procurement Assistant',
  description: 'Track orders, verify escrow protection, compare wholesale prices, and resolve delivery disputes.',
};

export default async function BuyerAssistantPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto w-full h-[calc(100vh-110px)] md:h-[calc(100vh-130px)] min-h-[600px] flex flex-col">
      <header className="sr-only">
        <h1>Cropify Buyer Copilot — Procurement & Escrow Assistant</h1>
      </header>
      <div className="flex-1 min-h-0 w-full flex flex-col">
        <CopilotChat role="buyer" />
      </div>
    </div>
  );
}
