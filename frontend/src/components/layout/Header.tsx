import { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  Settings,
  ChevronDown,
  Store,
} from 'lucide-react';

interface HeaderProps {
  onOpenCommandPalette?: () => void;
  storeName?: string;
  notificationCount?: number;
  onStoreSelect?: (storeId: string) => void;
  onSettingsClick?: () => void;
  onNotificationsClick?: () => void;
}

export function Header({
  onOpenCommandPalette,
  storeName = 'My Store',
  notificationCount = 0,
  onStoreSelect,
  onSettingsClick,
  onNotificationsClick,
}: HeaderProps) {
  const [isMac, setIsMac] = useState(false);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);

  useEffect(() => {
    // Detect if user is on Mac
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      onOpenCommandPalette?.();
    }
  };

  // Placeholder stores for dropdown
  const stores = [
    { id: '1', name: storeName },
    { id: '2', name: 'Second Store' },
    { id: '3', name: 'Third Store' },
  ];

  return (
    <header
      onKeyDown={handleKeyDown}
      className="
        h-16 bg-white border-b border-zinc-200
        flex items-center justify-between px-6
        sticky top-0 z-30
      "
    >
      {/* Left side - Search/Command Palette Trigger */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenCommandPalette}
          className="
            flex items-center gap-3 px-4 py-2
            bg-zinc-50 hover:bg-zinc-100
            border border-zinc-200 hover:border-zinc-300
            rounded-lg transition-all duration-200
            text-zinc-500 hover:text-zinc-700
            min-w-[280px]
          "
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Search or jump to...</span>
          <kbd
            className="
              ml-auto px-2 py-0.5
              bg-zinc-100 border border-zinc-200
              rounded text-xs font-mono text-zinc-500
            "
          >
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Store Selector */}
        <div className="relative">
          <button
            onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
            className="
              flex items-center gap-2 px-3 py-2
              bg-zinc-50 hover:bg-zinc-100
              border border-zinc-200 hover:border-zinc-300
              rounded-lg transition-all duration-200
              text-zinc-700 hover:text-zinc-900
            "
          >
            <Store className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium max-w-[120px] truncate">
              {storeName}
            </span>
            <ChevronDown
              className={`
                w-4 h-4 text-zinc-400 transition-transform duration-200
                ${isStoreDropdownOpen ? 'rotate-180' : ''}
              `}
            />
          </button>

          {/* Store Dropdown */}
          {isStoreDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsStoreDropdownOpen(false)}
              />
              {/* Dropdown Menu */}
              <div
                className="
                  absolute right-0 top-full mt-2 w-56
                  bg-white border border-zinc-200
                  rounded-lg shadow-lg z-50
                  py-1 animate-fade-in
                "
              >
                <div className="px-3 py-2 border-b border-zinc-100">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Switch Store
                  </p>
                </div>
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => {
                      onStoreSelect?.(store.id);
                      setIsStoreDropdownOpen(false);
                    }}
                    className={`
                      w-full px-3 py-2 text-left
                      flex items-center gap-2
                      hover:bg-zinc-50 transition-colors
                      ${store.name === storeName ? 'text-emerald-600' : 'text-zinc-700'}
                    `}
                  >
                    <Store className="w-4 h-4" />
                    <span className="text-sm">{store.name}</span>
                    {store.name === storeName && (
                      <span className="ml-auto text-xs text-emerald-600">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className="
            relative p-2 rounded-lg
            text-zinc-500 hover:text-zinc-700
            hover:bg-zinc-100
            transition-all duration-200
          "
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span
              className="
                absolute -top-0.5 -right-0.5
                w-4 h-4 rounded-full
                bg-emerald-500 text-white
                text-xs font-medium
                flex items-center justify-center
              "
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="
            p-2 rounded-lg
            text-zinc-500 hover:text-zinc-700
            hover:bg-zinc-100
            transition-all duration-200
          "
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

export default Header;
