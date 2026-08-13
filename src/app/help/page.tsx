import { redirect } from 'next/navigation';

// /help and /faq are the same page — keep both URLs working since both are
// commonly used, but only maintain content in one place.
export default function HelpPage() {
  redirect('/faq');
}
