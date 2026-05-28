/**
 * Social Planner - UI Store
 *
 * Zustand store for UI state management (sidebar, modals, etc.)
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UIState {
  isSidebarOpen: boolean;

  // Actions
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isSidebarOpen: false,

  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

// Selector hooks for common use cases
export const useIsSidebarOpen = () => useUIStore((state) => state.isSidebarOpen);

interface SidebarControls {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Convenience hook that returns sidebar state and actions
 */
export function useSidebar(): SidebarControls {
  return useUIStore(
    useShallow((state) => ({
      isOpen: state.isSidebarOpen,
      open: state.openSidebar,
      close: state.closeSidebar,
      toggle: state.toggleSidebar,
    }))
  );
}

/**
 * Hook that auto-closes the sidebar on route changes (for mobile navigation)
 */
export function useSidebarAutoClose(): void {
  const location = useLocation();
  const closeSidebar = useUIStore((state) => state.closeSidebar);

  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);
}
