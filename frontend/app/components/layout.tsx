import { Link, useLocation } from 'react-router';
import { MessageSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <span className="hidden font-bold sm:inline-block">
                Islamic Finance Assistant
              </span>
            </Link>
          </div>
          <nav className="flex flex-1 items-center justify-end space-x-6 text-sm font-medium">
            <Link
              to="/"
              className={cn(
                'transition-colors hover:text-foreground/80',
                isActive('/') ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              Chat
            </Link>
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-2 transition-colors hover:text-foreground/80',
                isActive('/admin') ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              <Settings className="h-4 w-4" />
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex items-center justify-center md:h-14">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            Built for learning Islamic finance principles. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
