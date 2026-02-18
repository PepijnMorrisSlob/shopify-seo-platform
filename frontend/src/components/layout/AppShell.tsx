import { useState, useCallback, useEffect, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';

interface AppShellProps {
  children: ReactNode;
  activeNavItem?: string;
  storeName?: string;
  notificationCount?: number;
  onNavigate?: (path: string) => void;
}

export function AppShell({
  children,
  activeNavItem,
  storeName = 'My Store',
  notificationCount = 0,
  onNavigate,
}: AppShellProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Placeholder recent items for command palette
  const recentItems = [
    { id: '1', label: 'Product SEO Audit', path: '/products/audit' },
    { id: '2', label: 'Content Calendar', path: '/content/calendar' },
    { id: '3', label: 'Analytics Report', path: '/analytics' },
  ];

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle global keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const handleCloseCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      setIsCommandPaletteOpen(false);
      setIsMobileSidebarOpen(false);
      onNavigate?.(path);
    },
    [onNavigate]
  );

  const handleSettingsClick = useCallback(() => {
    handleNavigate('/settings');
  }, [handleNavigate]);

  const handleNotificationsClick = useCallback(() => {
    // Placeholder for notifications panel
    console.log('Opening notifications...');
  }, []);

  const handleStoreSelect = useCallback((storeId: string) => {
    // Placeholder for store selection
    console.log('Selected store:', storeId);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Sidebar - hidden on mobile unless toggled */}
      {!isMobile && (
        <Sidebar
          activeItem={activeNavItem}
          onNavigate={handleNavigate}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 animate-slide-up">
            <Sidebar
              activeItem={activeNavItem}
              onNavigate={handleNavigate}
            />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div
        className={`
          min-h-screen
          transition-all duration-200
          ${isMobile ? 'ml-0' : 'ml-16'}
        `}
        onMouseEnter={() => !isMobile && setIsSidebarExpanded(false)}
      >
        {/* Header */}
        <Header
          onOpenCommandPalette={handleOpenCommandPalette}
          storeName={storeName}
          notificationCount={notificationCount}
          onStoreSelect={handleStoreSelect}
          onSettingsClick={handleSettingsClick}
          onNotificationsClick={handleNotificationsClick}
        />

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={handleCloseCommandPalette}
        onNavigate={handleNavigate}
        recentItems={recentItems}
      />

      {/* Mobile Bottom Navigation (optional enhancement) */}
      {isMobile && (
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="
            fixed bottom-6 left-6 z-30
            w-12 h-12 rounded-full
            bg-emerald-500 hover:bg-emerald-400
            text-white shadow-lg
            flex items-center justify-center
            transition-all duration-200
          "
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default AppShell;
