import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Home,
  Package,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  X,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  group: 'navigation' | 'actions' | 'recent';
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
  recentItems?: Array<{ id: string; label: string; path: string }>;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  recentItems = [],
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Navigation commands
  const navigationCommands: CommandItem[] = [
    {
      id: 'nav-home',
      label: 'Dashboard',
      description: 'Go to home dashboard',
      icon: Home,
      action: () => onNavigate?.('/'),
      group: 'navigation',
      keywords: ['home', 'main', 'overview'],
    },
    {
      id: 'nav-products',
      label: 'Products',
      description: 'Manage product SEO',
      icon: Package,
      action: () => onNavigate?.('/products'),
      group: 'navigation',
      keywords: ['items', 'inventory'],
    },
    {
      id: 'nav-content',
      label: 'Content Hub',
      description: 'Q&A content management',
      icon: FileText,
      action: () => onNavigate?.('/content/discover'),
      group: 'navigation',
      keywords: ['qa', 'questions', 'answers', 'blog'],
    },
    {
      id: 'nav-calendar',
      label: 'Calendar',
      description: 'Content calendar',
      icon: Calendar,
      action: () => onNavigate?.('/content/calendar'),
      group: 'navigation',
      keywords: ['schedule', 'planning'],
    },
    {
      id: 'nav-analytics',
      label: 'Analytics',
      description: 'Performance metrics',
      icon: BarChart3,
      action: () => onNavigate?.('/analytics'),
      group: 'navigation',
      keywords: ['stats', 'metrics', 'reports', 'performance'],
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      description: 'App settings',
      icon: Settings,
      action: () => onNavigate?.('/settings'),
      group: 'navigation',
      keywords: ['preferences', 'configuration', 'options'],
    },
  ];

  // Action commands
  const actionCommands: CommandItem[] = [
    {
      id: 'action-new-post',
      label: 'New Blog Post',
      description: 'Create a new blog post',
      icon: Plus,
      action: () => {
        // Placeholder action
        console.log('Creating new blog post...');
        onClose();
      },
      group: 'actions',
      keywords: ['create', 'write', 'article'],
    },
    {
      id: 'action-sync',
      label: 'Sync Products',
      description: 'Sync products from Shopify',
      icon: RefreshCw,
      action: () => {
        // Placeholder action
        console.log('Syncing products...');
        onClose();
      },
      group: 'actions',
      keywords: ['refresh', 'update', 'import'],
    },
  ];

  // Recent items as commands
  const recentCommands: CommandItem[] = recentItems.map((item) => ({
    id: `recent-${item.id}`,
    label: item.label,
    icon: Clock,
    action: () => onNavigate?.(item.path),
    group: 'recent' as const,
  }));

  // All commands combined
  const allCommands = [...recentCommands, ...navigationCommands, ...actionCommands];

  // Filter commands based on query
  const filteredCommands = query
    ? allCommands.filter((cmd) => {
        const searchText = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(searchText) ||
          cmd.description?.toLowerCase().includes(searchText) ||
          cmd.keywords?.some((kw) => kw.toLowerCase().includes(searchText))
        );
      })
    : allCommands;

  // Group filtered commands
  const groupedCommands = {
    recent: filteredCommands.filter((cmd) => cmd.group === 'recent'),
    navigation: filteredCommands.filter((cmd) => cmd.group === 'navigation'),
    actions: filteredCommands.filter((cmd) => cmd.group === 'actions'),
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [isOpen, filteredCommands, selectedIndex, onClose]
  );

  // Global keyboard shortcut to open palette
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // This would be handled by parent, but we can close if open
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredCommands.length > 0) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, filteredCommands.length]);

  if (!isOpen) return null;

  let itemIndex = 0;

  const renderGroup = (
    title: string,
    commands: CommandItem[],
    icon?: React.ElementType
  ) => {
    if (commands.length === 0) return null;

    const GroupIcon = icon;

    return (
      <div className="py-2">
        <div className="px-3 py-1.5 flex items-center gap-2">
          {GroupIcon && <GroupIcon className="w-3 h-3 text-zinc-500" />}
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            {title}
          </span>
        </div>
        {commands.map((cmd) => {
          const Icon = cmd.icon;
          const currentIndex = itemIndex++;
          const isSelected = currentIndex === selectedIndex;

          return (
            <button
              key={cmd.id}
              data-index={currentIndex}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(currentIndex)}
              className={`
                w-full px-3 py-2 flex items-center gap-3
                transition-colors duration-100
                ${
                  isSelected
                    ? 'bg-emerald-50 text-zinc-900'
                    : 'text-zinc-600 hover:text-zinc-900'
                }
              `}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isSelected ? 'text-emerald-600' : ''
                }`}
              />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{cmd.label}</p>
                {cmd.description && (
                  <p className="text-xs text-zinc-500">{cmd.description}</p>
                )}
              </div>
              {isSelected && (
                <ArrowRight className="w-4 h-4 text-zinc-500" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="
          fixed top-[20%] left-1/2 -translate-x-1/2
          w-full max-w-xl
          bg-white border border-zinc-200
          rounded-xl shadow-2xl
          z-50 animate-slide-up
          overflow-hidden
        "
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200">
          <Search className="w-5 h-5 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands..."
            className="
              flex-1 bg-transparent
              text-zinc-900 placeholder-zinc-400
              text-sm outline-none
            "
          />
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Commands List */}
        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto py-2"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              <p className="text-sm">No results found for "{query}"</p>
            </div>
          ) : (
            <>
              {renderGroup('Recent', groupedCommands.recent, Clock)}
              {renderGroup('Navigation', groupedCommands.navigation)}
              {renderGroup('Actions', groupedCommands.actions)}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-200 rounded text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-200 rounded text-[10px]">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-200 rounded text-[10px]">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default CommandPalette;
