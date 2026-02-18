import { useState, useCallback } from 'react';
import {
  Home,
  Package,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
  BookOpen,
  Network,
  Globe,
  Shield,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

interface SidebarProps {
  activeItem?: string;
  onNavigate?: (path: string) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  { id: 'products', label: 'Products', icon: Package, path: '/products' },
  { id: 'content', label: 'Content', icon: FileText, path: '/content/discover' },
  { id: 'topical-map', label: 'Topical Map', icon: Network, path: '/topical-map' },
  { id: 'competitors', label: 'Competitors', icon: Globe, path: '/competitors' },
  { id: 'brand-visibility', label: 'Brand Visibility', icon: Eye, path: '/brand-visibility' },
  { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen, path: '/knowledge-base' },
  { id: 'seo-audit', label: 'SEO Audit', icon: Shield, path: '/seo-audit' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/content/calendar' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (!isPinned) {
      setIsExpanded(true);
    }
  }, [isPinned]);

  const handleMouseLeave = useCallback(() => {
    if (!isPinned) {
      setIsExpanded(false);
    }
  }, [isPinned]);

  const togglePin = useCallback(() => {
    setIsPinned((prev) => !prev);
    setIsExpanded((prev) => !prev);
  }, []);

  const handleNavClick = useCallback(
    (path: string) => {
      if (onNavigate) {
        onNavigate(path);
      }
    },
    [onNavigate]
  );

  const isActiveItem = (item: NavItem): boolean => {
    if (activeItem) {
      return item.id === activeItem;
    }
    // Fallback to path matching if activeItem is not provided
    return false;
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        fixed left-0 top-0 z-40 h-screen
        bg-white border-r border-zinc-200
        flex flex-col
        transition-all duration-200 ease-out
        ${isExpanded ? 'w-60' : 'w-16'}
      `}
    >
      {/* Logo / Brand Area */}
      <div className="h-16 flex items-center justify-center border-b border-zinc-200">
        <div
          className={`
            flex items-center gap-3 overflow-hidden
            transition-all duration-200
            ${isExpanded ? 'px-4 w-full' : 'px-0 w-auto'}
          `}
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span
            className={`
              text-zinc-900 font-semibold whitespace-nowrap
              transition-opacity duration-200
              ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}
            `}
          >
            SEO Platform
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveItem(item);

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200
                group relative
                ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full" />
              )}

              <Icon
                className={`
                  w-5 h-5 flex-shrink-0
                  transition-transform duration-200
                  ${isActive ? 'text-emerald-600' : 'group-hover:scale-110'}
                `}
              />

              <span
                className={`
                  whitespace-nowrap font-medium text-sm
                  transition-all duration-200
                  ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}
                `}
              >
                {item.label}
              </span>

              {/* Tooltip for collapsed state */}
              {!isExpanded && (
                <div
                  className="
                    absolute left-full ml-3 px-2 py-1
                    bg-zinc-800 text-white text-sm rounded-md
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    transition-all duration-200
                    whitespace-nowrap z-50
                    pointer-events-none
                    shadow-lg
                  "
                >
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse/Expand Toggle */}
      <div className="p-2 border-t border-zinc-200">
        <button
          onClick={togglePin}
          className={`
            w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700
            transition-all duration-200
          `}
        >
          {isPinned ? (
            <>
              <ChevronLeft className="w-4 h-4" />
              {isExpanded && <span className="text-sm">Collapse</span>}
            </>
          ) : (
            <>
              <ChevronRight className="w-4 h-4" />
              {isExpanded && <span className="text-sm">Keep Open</span>}
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
