import { FarmerNav } from '@/components/shared/Navbar';

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FarmerNav />
    </>
  );
}
