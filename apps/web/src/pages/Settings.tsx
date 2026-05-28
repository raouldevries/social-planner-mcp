/**
 * Settings Page
 *
 * User settings with tabs for Profile, Security, and Admin (users).
 */

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ProfileSettings,
  SecuritySettings,
  UserManagement,
  AmbassadorSettings,
  MCPSettings,
} from '@/components/settings';
import { useIsAdmin, useCanEdit } from '@/stores/authStore';

type SettingsTab = 'profile' | 'security' | 'mcp' | 'users' | 'ambassadors';

const TABS: { id: SettingsTab; label: string; adminOnly?: boolean; editorOnly?: boolean }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'mcp', label: 'AI Assistants' },
  { id: 'users', label: 'User Management', adminOnly: true },
  { id: 'ambassadors', label: 'Ambassadors', editorOnly: true },
];

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = useIsAdmin();
  const canEdit = useCanEdit();

  // Get initial tab from URL or default to 'profile'
  const urlTab = searchParams.get('tab') as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    urlTab && isValidTab(urlTab, isAdmin, canEdit) ? urlTab : 'profile'
  );

  // Sync tab state with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const newTab = searchParams.get('tab') as SettingsTab | null;
    if (newTab && isValidTab(newTab, isAdmin, canEdit) && newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [searchParams, isAdmin, canEdit, activeTab]);

  const handleTabChange = useCallback(
    (tab: SettingsTab) => {
      setActiveTab(tab);
      setSearchParams({ tab });
    },
    [setSearchParams]
  );

  // Filter tabs based on user role
  const visibleTabs = TABS.filter(
    (tab) => (!tab.adminOnly || isAdmin) && (!tab.editorOnly || canEdit)
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div
        className="mb-6 sm:mb-8"
        data-feedback-target="settings-header"
        data-feedback-label="Settings Header"
      >
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs - pill-shaped segment control, scrollable on mobile */}
      <div
        className="flex p-1 bg-neutral-100 rounded-xl w-fit max-w-full overflow-x-auto mb-6 sm:mb-8"
        data-feedback-target="settings-tabs"
        data-feedback-label="Settings Tabs"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap min-h-[44px]',
              'transition-all duration-200 ease-out',
              activeTab === tab.id
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className="pb-12"
        data-feedback-target="settings-content"
        data-feedback-label="Settings Content"
      >
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'mcp' && <MCPSettings />}
        {activeTab === 'users' && isAdmin && <UserManagement />}
        {activeTab === 'ambassadors' && canEdit && <AmbassadorSettings />}
      </div>
    </div>
  );
}

function isValidTab(tab: string, isAdmin: boolean, canEdit: boolean): tab is SettingsTab {
  if (tab === 'profile' || tab === 'security' || tab === 'mcp') return true;
  if (tab === 'users' && isAdmin) return true;
  if (tab === 'ambassadors' && canEdit) return true;
  return false;
}
