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
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 sm:h-16 items-center px-4 sm:px-6">
          <div className="mr-2 sm:mr-4 flex">
            <Link to="/" className="mr-4 sm:mr-6 flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <span className="hidden font-bold sm:inline-block text-sm sm:text-base">
                Islamic Finance Assistant
              </span>
            </Link>
          </div>
          <nav className="flex flex-1 items-center justify-end space-x-4 sm:space-x-6 text-xs sm:text-sm font-medium">
            <Link
              to="/"
              className={cn(
                'transition-all duration-200 hover:text-foreground/80 hover:scale-105',
                isActive('/') ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              Chat
            </Link>
            <Link
              to="/admin"
              className={cn(
                'flex items-center gap-2 transition-all duration-200 hover:text-foreground/80 hover:scale-105',
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
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 sm:py-6 md:py-0">
        <div className="container flex items-center justify-center md:h-14 px-4">
          <p className="text-center text-xs sm:text-sm leading-loose text-muted-foreground">
            Built for learning Islamic finance principles. Not financial advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
