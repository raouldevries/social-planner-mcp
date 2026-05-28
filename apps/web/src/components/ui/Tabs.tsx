/**
 * Tabs Component
 *
 * Tab navigation with panels.
 */

import { useState, createContext, useContext, type ReactNode } from 'react';
import { clsx } from 'clsx';

// Context
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// Tabs Container
export interface TabsProps {
  defaultTab: string;
  children: ReactNode;
  className?: string;
  onChange?: (tabId: string) => void;
}

export function Tabs({ defaultTab, children, className, onChange }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleSetActiveTab = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

// Tab List
export interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className }: TabListProps) {
  return (
    <div
      className={clsx('flex border-b border-gray-200', className)}
      role="tablist"
    >
      {children}
    </div>
  );
}

// Tab Button
export interface TabProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}

export function Tab({ id, children, disabled, icon }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      id={`tab-${id}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(id)}
      className={clsx(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
        isActive
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
}

// Tab Panels Container
export interface TabPanelsProps {
  children: ReactNode;
  className?: string;
}

export function TabPanels({ children, className }: TabPanelsProps) {
  return <div className={clsx('mt-4', className)}>{children}</div>;
}

// Tab Panel
export interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className }: TabPanelProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={clsx('animate-fade-in', className)}
    >
      {children}
    </div>
  );
}
