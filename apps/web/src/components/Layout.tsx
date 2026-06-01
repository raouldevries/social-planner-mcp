/**
 * Social Planner - Main Layout Component
 *
 * Application shell with navigation sidebar and header.
 */

import { Link, Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useUser, useCanEdit, useIsAdmin, useIsDemo } from '@/stores/authStore';
import { useSidebar, useSidebarAutoClose } from '@/stores/uiStore';
import { useLogout } from '@/hooks/useAuth';
import { PendingActionsIndicator } from '@/components/mcp';
import { FeedbackModeProvider } from '@/components/feedback/FeedbackModeContext';
import { FeedbackModeOverlay } from '@/components/feedback/FeedbackModeOverlay';
import { FeedbackModeBanner } from '@/components/feedback/FeedbackModeBanner';
import { FeedbackPopover } from '@/components/feedback/FeedbackPopover';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

// SVG Icon Components
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function PostsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function ArticlesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function MediaIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function AccountsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function AmbassadorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
      />
    </svg>
  );
}

function FeedbackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
      />
    </svg>
  );
}

function AnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    </svg>
  );
}

// Animated hamburger button that transforms to X when open
function HamburgerButton({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center w-11 h-11 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
    >
      <div className="w-5 h-4 flex flex-col justify-between">
        <motion.span
          className="block h-0.5 bg-neutral-700 rounded-full origin-center"
          animate={{
            rotate: isOpen ? 45 : 0,
            y: isOpen ? 7 : 0,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
        <motion.span
          className="block h-0.5 bg-neutral-700 rounded-full"
          animate={{
            opacity: isOpen ? 0 : 1,
            scaleX: isOpen ? 0 : 1,
          }}
          transition={{ duration: 0.15 }}
        />
        <motion.span
          className="block h-0.5 bg-neutral-700 rounded-full origin-center"
          animate={{
            rotate: isOpen ? -45 : 0,
            y: isOpen ? -7 : 0,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
      </div>
    </button>
  );
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresEdit?: boolean;
  requiresAdmin?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: DashboardIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Posts', href: '/posts', icon: PostsIcon, requiresEdit: true },
  { name: 'Articles', href: '/articles', icon: ArticlesIcon, requiresEdit: true },
  { name: 'Analytics', href: '/analytics', icon: AnalyticsIcon, requiresEdit: true },
  { name: 'Media', href: '/media', icon: MediaIcon, requiresEdit: true },
  { name: 'Accounts', href: '/accounts', icon: AccountsIcon, requiresEdit: true },
  { name: 'Ambassador', href: '/ambassador', icon: AmbassadorIcon },
  { name: 'Feedback', href: '/feedback', icon: FeedbackIcon },
  { name: 'Users', href: '/users', icon: UsersIcon, requiresAdmin: true },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export function Layout() {
  const location = useLocation();
  const user = useUser();
  const canEdit = useCanEdit();
  const isAdmin = useIsAdmin();
  const isDemo = useIsDemo();
  const logoutMutation = useLogout();
  const { isOpen: isSidebarOpen, toggle: toggleSidebar, close: closeSidebar } = useSidebar();

  // Auto-close sidebar on route changes (mobile)
  useSidebarAutoClose();

  // Filter nav items based on user role
  const filteredNav = navigation.filter((item) => {
    if (item.requiresAdmin && !isAdmin) return false;
    if (item.requiresEdit && !canEdit) return false;
    return true;
  });

  const feedbackEnabled = import.meta.env.VITE_FEEDBACK_ENABLED === 'true';

  return (
    <FeedbackModeProvider>
      <div className="min-h-screen bg-neutral-50">
        {/* Feedback system */}
        {feedbackEnabled && (
          <>
            <FeedbackButton />
            <FeedbackModeOverlay />
            <FeedbackModeBanner />
            <FeedbackPopover />
          </>
        )}

        {/* Mobile backdrop overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              className="fixed inset-0 z-30 bg-black/20 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeSidebar}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 w-64 bg-white border-r border-neutral-200',
            'transform transition-transform duration-300 ease-out',
            'z-40 lg:z-auto',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-neutral-200">
            <Link to="/" className="text-xl font-bold text-primary-600">
              Social Planner
            </Link>
          </div>

          {/* Navigation with sliding highlight */}
          <nav
            className="relative p-4 space-y-1"
            data-feedback-target="sidebar-navigation"
            data-feedback-label="Sidebar Navigation"
          >
            {/* Sliding highlight indicator */}
            {(() => {
              const activeIndex = filteredNav.findIndex(
                (item) =>
                  location.pathname === item.href ||
                  (item.href !== '/' && location.pathname.startsWith(item.href))
              );
              if (activeIndex === -1) return null;

              return (
                <motion.div
                  className="absolute left-4 right-4 h-9 bg-primary-50 rounded-lg"
                  initial={false}
                  animate={{
                    y: activeIndex * 40, // 36px item height + 4px gap
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                  }}
                />
              );
            })()}

            {filteredNav.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));

              return (
                <motion.div
                  key={item.name}
                  whileHover={{ x: isActive ? 0 : 4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Link
                    to={item.href}
                    className={clsx(
                      'relative z-10 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'text-primary-700' : 'text-neutral-700 hover:text-neutral-900'
                    )}
                  >
                    <motion.div
                      animate={{ scale: isActive ? 1.1 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <item.icon
                        className={clsx(
                          'w-5 h-5',
                          isActive ? 'text-primary-600' : 'text-neutral-500'
                        )}
                      />
                    </motion.div>
                    {item.name}
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="lg:pl-64">
          {/* Header */}
          <header className="sticky top-0 z-10 flex items-center justify-between h-16 bg-white border-b border-neutral-200 safe-area-x">
            {/* Mobile hamburger menu */}
            <div className="lg:hidden">
              <HamburgerButton isOpen={isSidebarOpen} onClick={toggleSidebar} />
            </div>
            <div className="hidden lg:block" />

            {/* User menu */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* MCP Pending Actions */}
              <PendingActionsIndicator />

              <div className="hidden sm:block text-sm">
                <div className="font-medium text-neutral-900">{user?.fullName}</div>
                <div className="text-neutral-500">{user?.role}</div>
              </div>
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="btn-secondary text-xs min-h-[44px] min-w-[44px]"
              >
                Logout
              </button>
            </div>
          </header>

          {/* Read-only demo banner */}
          {isDemo && (
            <div
              role="status"
              className="flex items-center justify-center bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800 safe-area-x"
            >
              <span>
                <span className="font-medium">Demo mode — read-only.</span> You can explore
                everything, but changes are disabled.
              </span>
            </div>
          )}

          {/* Page content */}
          <main className="py-4 lg:py-6 safe-area-x">
            <Outlet />
          </main>
        </div>
      </div>
    </FeedbackModeProvider>
  );
}
