'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ServiceStatusIndicator } from '@/components/ServiceStatusIndicator';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDevDialog, setShowDevDialog] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check if current page is login or register (public pages)
  const isAuthPage = pathname === '/dashboard/login' || pathname === '/dashboard/register';

  useEffect(() => {
    // Skip authentication check for auth pages
    if (isAuthPage) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/dashboard/login');
      return;
    }

    setUser(JSON.parse(userData));
    setLoading(false);
  }, [router, isAuthPage]);

  const handleLogout = () => {
    console.log('Sign out clicked');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/dashboard/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  // Render auth pages without sidebar
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-background border-r border-foreground/10">
        <div className="p-6 flex flex-col h-full">
          <Link href="/dashboard" className="mb-8">
            <h1 className="text-2xl font-light text-foreground hover:text-muted-foreground transition-colors">
              MasterFabric
            </h1>
          </Link>
          <nav className="space-y-1 flex-1">
            <Link
              href="/dashboard/organizations"
              className="block px-3 py-2 text-foreground hover:bg-muted transition-colors"
            >
              Organizations
            </Link>
            <Link
              href="/dashboard/projects"
              className="block px-3 py-2 text-foreground hover:bg-muted transition-colors"
            >
              Projects
            </Link>
            {user?.role === 'OWNER' && (
              <Link
                href="/dashboard/settings"
                className="block px-3 py-2 text-foreground hover:bg-muted transition-colors"
              >
                Settings
              </Link>
            )}
          </nav>
          
          {/* User Info and Sign Out */}
          <div className="mt-auto pt-6 border-t border-foreground/10">
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => setShowDevDialog(true)}
                className="w-full mb-3 px-2 py-1 bg-green-600 text-white text-xs font-medium text-center hover:bg-green-700 transition-colors cursor-pointer"
              >
                Local Development
              </button>
            )}
            {user?.role && (
              <div className="mb-2 px-2 py-1 bg-muted text-center">
                <span className="text-xs text-muted-foreground">Role: </span>
                <span className="text-xs font-medium text-foreground">{user.role}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-2">{user?.email}</p>
            <button
              onClick={handleLogout}
              className="text-sm text-foreground hover:text-muted-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar with Status Indicator */}
        <div className="border-b border-foreground/10 px-8 py-4 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">System Status</span>
            <ServiceStatusIndicator />
          </div>
        </div>
        
        <main className="flex-1 overflow-auto bg-background p-8">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="border-t border-foreground/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              © 2025 MasterFabric. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/masterfabric"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href="mailto:info@masterfabric.co"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Development Info Dialog */}
      {showDevDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background border border-foreground/20 max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-medium text-foreground mb-4">Local Development Mode</h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                You are currently running MasterFabric in local development mode.
              </p>
              <p>
                This environment is for testing and development purposes only.
              </p>
              <div className="pt-4 border-t border-foreground/10">
                <p className="text-foreground font-medium mb-2">Need help or want to learn more?</p>
                <p>
                  Contact{' '}
                  <a
                    href="https://github.com/gurkanfikretgunak"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline hover:text-muted-foreground"
                  >
                    @gurkanfikretgunak
                  </a>
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDevDialog(false)}
                className="px-4 py-2 bg-foreground text-background hover:bg-muted-foreground transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
