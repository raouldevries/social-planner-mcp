/**
 * Calendar Sidebar
 *
 * Filter panel for the calendar view with refined, Apple-inspired design.
 *
 * Design principles applied:
 * - Progressive disclosure: Show only what's needed now
 * - Generous whitespace: Let elements breathe
 * - Subtle interactions: Smooth, physical-feeling transitions
 * - Minimal chrome: Content over decoration
 */

import { useState, useCallback } from 'react';
import { POST_STATUS, SOCIAL_PLATFORM } from '@social-planner/shared';

interface CalendarSidebarProps {
  selectedStatuses: string[];
  selectedPlatform: string | null;
  onStatusChange: (statuses: string[]) => void;
  onPlatformChange: (platform: string | null) => void;
  onNewPost: () => void;
  onNewArticle: () => void;
  onNewEvent: () => void;
  showIssueCalendar: boolean;
  onIssueCalendarToggle: (show: boolean) => void;
  showCustomEvents: boolean;
  onCustomEventsToggle: (show: boolean) => void;
  showArticles: boolean;
  onArticlesToggle: (show: boolean) => void;
}

// Status configuration with refined, muted colors
const statusConfig = [
  {
    value: POST_STATUS.DRAFT,
    label: 'Draft',
    dotColor: 'bg-neutral-400',
    activeColor: 'bg-neutral-100',
  },
  {
    value: POST_STATUS.PENDING_APPROVAL,
    label: 'Pending',
    dotColor: 'bg-amber-500',
    activeColor: 'bg-amber-50',
  },
  {
    value: POST_STATUS.APPROVED,
    label: 'Approved',
    dotColor: 'bg-emerald-500',
    activeColor: 'bg-emerald-50',
  },
  {
    value: POST_STATUS.SCHEDULED,
    label: 'Scheduled',
    dotColor: 'bg-violet-500',
    activeColor: 'bg-violet-50',
  },
  {
    value: POST_STATUS.PUBLISHED,
    label: 'Published',
    dotColor: 'bg-green-500',
    activeColor: 'bg-green-50',
  },
  {
    value: POST_STATUS.REJECTED,
    label: 'Rejected',
    dotColor: 'bg-red-500',
    activeColor: 'bg-red-50',
  },
];

// Platform configuration
const platformConfig = [
  {
    value: SOCIAL_PLATFORM.INSTAGRAM,
    label: 'Instagram',
    icon: <InstagramIcon />,
    activeColor: 'bg-pink-50',
    iconColor: 'text-pink-600',
  },
  {
    value: SOCIAL_PLATFORM.LINKEDIN,
    label: 'LinkedIn',
    icon: <LinkedInIcon />,
    activeColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
];

export function CalendarSidebar({
  selectedStatuses,
  selectedPlatform,
  onStatusChange,
  onPlatformChange,
  onNewPost,
  onNewArticle,
  onNewEvent,
  showIssueCalendar,
  onIssueCalendarToggle,
  showCustomEvents,
  onCustomEventsToggle,
  showArticles,
  onArticlesToggle,
}: CalendarSidebarProps) {
  const [statusExpanded, setStatusExpanded] = useState(true);
  const [platformExpanded, setPlatformExpanded] = useState(true);

  const handleStatusToggle = useCallback(
    (status: string) => {
      if (selectedStatuses.includes(status)) {
        onStatusChange(selectedStatuses.filter((s) => s !== status));
      } else {
        onStatusChange([...selectedStatuses, status]);
      }
    },
    [selectedStatuses, onStatusChange]
  );

  const handlePlatformSelect = useCallback(
    (platform: string) => {
      onPlatformChange(selectedPlatform === platform ? null : platform);
    },
    [selectedPlatform, onPlatformChange]
  );

  const hasFilters = selectedStatuses.length > 0 || selectedPlatform !== null;

  const clearFilters = useCallback(() => {
    onStatusChange([]);
    onPlatformChange(null);
  }, [onStatusChange, onPlatformChange]);

  return (
    <aside className="w-64 bg-white border-r border-neutral-100 flex flex-col">
      {/* Header - clean, minimal */}
      <div className="px-5 py-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">Filters</h2>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="
                text-xs font-medium text-primary-600
                hover:text-primary-700 active:text-primary-800
                transition-colors duration-150
              "
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter sections - generous spacing */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Status filter section */}
        <FilterSection
          title="Status"
          count={selectedStatuses.length}
          expanded={statusExpanded}
          onToggle={() => setStatusExpanded(!statusExpanded)}
        >
          <div className="space-y-0.5">
            {statusConfig.map((status) => {
              const isActive = selectedStatuses.includes(status.value);
              return (
                <button
                  key={status.value}
                  onClick={() => handleStatusToggle(status.value)}
                  className={`
                    flex items-center gap-3 w-full px-2.5 py-2 rounded-lg
                    text-left text-sm transition-all duration-150
                    ${
                      isActive
                        ? `${status.activeColor} text-neutral-900`
                        : 'text-neutral-600 hover:bg-neutral-50'
                    }
                  `}
                >
                  {/* Custom checkbox - subtle, refined */}
                  <span
                    className={`
                      flex items-center justify-center w-4 h-4 rounded
                      border transition-all duration-150
                      ${
                        isActive
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-neutral-300 bg-white'
                      }
                    `}
                  >
                    {isActive && <CheckIcon />}
                  </span>

                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />

                  {/* Label */}
                  <span className="flex-1">{status.label}</span>
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Platform filter section */}
        <FilterSection
          title="Platform"
          count={selectedPlatform ? 1 : 0}
          expanded={platformExpanded}
          onToggle={() => setPlatformExpanded(!platformExpanded)}
        >
          <div className="space-y-0.5">
            {platformConfig.map((platform) => {
              const isActive = selectedPlatform === platform.value;
              return (
                <button
                  key={platform.value}
                  onClick={() => handlePlatformSelect(platform.value)}
                  className={`
                    flex items-center gap-3 w-full px-2.5 py-2 rounded-lg
                    text-left text-sm transition-all duration-150
                    ${
                      isActive
                        ? `${platform.activeColor} text-neutral-900`
                        : 'text-neutral-600 hover:bg-neutral-50'
                    }
                  `}
                >
                  {/* Platform icon */}
                  <span className={`${platform.iconColor}`}>{platform.icon}</span>

                  {/* Label */}
                  <span className="flex-1">{platform.label}</span>

                  {/* Selection indicator */}
                  {isActive && (
                    <span className="text-primary-600">
                      <CheckIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Calendar overlays section */}
        <div className="pt-4 border-t border-neutral-100">
          <div className="px-2 space-y-2">
            {/* Articles toggle */}
            <button
              onClick={() => onArticlesToggle(!showArticles)}
              className="
                flex items-center justify-between gap-3 w-full px-2.5 py-2 rounded-lg
                text-left text-sm transition-all duration-150
                hover:bg-neutral-50
              "
            >
              <div className="flex items-center gap-3">
                <ArticleIcon />
                <span className="text-neutral-700">Articles</span>
              </div>
              <ToggleSwitch enabled={showArticles} color="blue" />
            </button>

            {/* Custom events toggle */}
            <button
              onClick={() => onCustomEventsToggle(!showCustomEvents)}
              className="
                flex items-center justify-between gap-3 w-full px-2.5 py-2 rounded-lg
                text-left text-sm transition-all duration-150
                hover:bg-neutral-50
              "
            >
              <div className="flex items-center gap-3">
                <EventIcon />
                <span className="text-neutral-700">Custom Events</span>
              </div>
              <ToggleSwitch enabled={showCustomEvents} color="sky" />
            </button>

            {/* Issue calendar toggle */}
            <button
              onClick={() => onIssueCalendarToggle(!showIssueCalendar)}
              className="
                flex items-center justify-between gap-3 w-full px-2.5 py-2 rounded-lg
                text-left text-sm transition-all duration-150
                hover:bg-neutral-50
              "
            >
              <div className="flex items-center gap-3">
                <CalendarIcon />
                <span className="text-neutral-700">Issuekalender 2026</span>
              </div>
              <ToggleSwitch enabled={showIssueCalendar} color="teal" />
            </button>
            <p className="pl-10 pr-2.5 text-xs text-neutral-400">
              Toon feestdagen en belangrijke data
            </p>
          </div>
        </div>
      </div>

      {/* Action footer - three buttons */}
      <div className="p-4 border-t border-neutral-100 space-y-2">
        <button
          onClick={onNewPost}
          className="
            flex items-center justify-center gap-2 w-full
            px-4 py-2.5 rounded-lg
            bg-primary-600 text-white text-sm font-medium
            shadow-sm hover:shadow-md
            hover:bg-primary-700 active:bg-primary-800
            transition-all duration-200 ease-out
          "
        >
          <PlusIcon />
          <span>New Post</span>
        </button>
        <button
          onClick={onNewArticle}
          className="
            flex items-center justify-center gap-2 w-full
            px-4 py-2 rounded-lg
            border border-neutral-200 text-neutral-700 text-sm font-medium
            hover:bg-neutral-50 hover:border-neutral-300
            active:bg-neutral-100
            transition-all duration-200 ease-out
          "
        >
          <ArticleIcon />
          <span>New Article</span>
        </button>
        <button
          onClick={onNewEvent}
          className="
            flex items-center justify-center gap-2 w-full
            px-4 py-2 rounded-lg
            border border-neutral-200 text-neutral-700 text-sm font-medium
            hover:bg-neutral-50 hover:border-neutral-300
            active:bg-neutral-100
            transition-all duration-200 ease-out
          "
        >
          <EventIcon />
          <span>New Event</span>
        </button>
      </div>
    </aside>
  );
}

// Collapsible filter section component
interface FilterSectionProps {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSection({ title, count, expanded, onToggle, children }: FilterSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="
          flex items-center justify-between w-full px-2 py-1.5
          text-left group
        "
      >
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {title}
          {count > 0 && <span className="ml-1.5 text-primary-600 normal-case">({count})</span>}
        </span>
        <span
          className={`
            text-neutral-400 transition-transform duration-200
            group-hover:text-neutral-600
            ${expanded ? 'rotate-0' : '-rotate-90'}
          `}
        >
          <ChevronDownIcon />
        </span>
      </button>

      {/* Animated content reveal */}
      <div
        className={`
          overflow-hidden transition-all duration-200 ease-out
          ${expanded ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}
        `}
      >
        {children}
      </div>
    </div>
  );
}

// Icons - clean, consistent weight
function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-3 h-3 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="w-4 h-4 text-teal-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function EventIcon() {
  return (
    <svg
      className="w-4 h-4 text-sky-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ArticleIcon() {
  return (
    <svg
      className="w-4 h-4 text-blue-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function ToggleSwitch({
  enabled,
  color = 'teal',
}: {
  enabled: boolean;
  color?: 'teal' | 'sky' | 'blue';
}) {
  const colorClasses = {
    teal: 'bg-teal-600',
    sky: 'bg-sky-600',
    blue: 'bg-blue-600',
  };

  return (
    <div
      className={`
        relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        ${enabled ? colorClasses[color] : 'bg-neutral-200'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
          ${enabled ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </div>
  );
}
