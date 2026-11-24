import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import AppNavigation from '../components/AppNavigation';

export const metadata: Metadata = {
  title: 'Blinkit Inventory & R.O. Manager',
  description: 'Multi-business inventory system for Blinkit quick-commerce sellers',
  manifest: '/manifest.json',
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          {/* Dynamic Role-Aware Top Navbar */}
          <AppNavigation />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
            <p>Blinkit Multi-Business Inventory SaaS &bull; Asia/Kolkata (IST) &bull; Ledger Enforced &bull; Spec 05a Compliant</p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
