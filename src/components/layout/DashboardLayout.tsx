'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-green-600">
                Kulima
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/farms">
                <Button variant="ghost">Farms</Button>
              </Link>
              <form action="/api/auth/logout" method="post">
                <Button variant="ghost">Sign Out</Button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}