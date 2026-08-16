import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NewsFeedPage } from '@/components/news/NewsFeedPage';

export default async function BuyerNewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');
  return <NewsFeedPage />;
}
