/**
 * Mobile UI Examples
 *
 * Showcase of different mobile UI patterns for review.
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

// Example 1: Dropdown Tabs (instead of scrolling pills)
function DropdownTabsExample() {
  const [activeTab, setActiveTab] = useState('profile');
  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Security' },
    { id: 'users', label: 'User Management' },
    { id: 'ambassadors', label: 'Ambassadors' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Option 1: Dropdown Tabs</h3>
      <p className="text-sm text-gray-500">Replace horizontal tabs with a dropdown on mobile</p>

      {/* Mobile: Dropdown */}
      <div className="sm:hidden">
        <Select value={activeTab} onChange={(e) => setActiveTab(e.target.value)} className="w-full">
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Desktop: Pills */}
      <div className="hidden sm:flex p-1 bg-neutral-100 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        Selected: {tabs.find((t) => t.id === activeTab)?.label}
      </div>
    </div>
  );
}

// Example 2: Bottom Navigation
function BottomNavExample() {
  const [active, setActive] = useState('home');
  const items = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'posts', label: 'Posts', icon: '📝' },
    { id: 'more', label: 'More', icon: '☰' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Option 2: Bottom Navigation</h3>
      <p className="text-sm text-gray-500">Fixed bottom bar for quick section access</p>

      <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: 200 }}>
        <div className="p-4 text-center text-gray-500">Content area</div>

        {/* Bottom Nav */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 flex justify-around">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={clsx(
                'flex flex-col items-center py-2 px-3 min-w-[64px] rounded-lg transition-colors',
                active === item.id ? 'text-primary-600 bg-primary-50' : 'text-gray-500'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Example 3: Collapsible Filters
function CollapsibleFiltersExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '', platform: '' });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Option 3: Collapsible Filters</h3>
      <p className="text-sm text-gray-500">Hide filters behind a button on mobile</p>

      {/* Mobile: Collapsible */}
      <div className="sm:hidden space-y-3">
        <Button
          variant="secondary"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between"
        >
          <span>
            Filters {(filters.search || filters.status || filters.platform) && '(Active)'}
          </span>
          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            ▼
          </motion.span>
        </Button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <Input
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Select>
                <Select
                  value={filters.platform}
                  onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                >
                  <option value="">All Platforms</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: Inline */}
      <div className="hidden sm:flex gap-3">
        <Input
          placeholder="Search..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="flex-1"
        />
        <Select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </Select>
        <Select
          value={filters.platform}
          onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
        >
          <option value="">All Platforms</option>
          <option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option>
        </Select>
      </div>
    </div>
  );
}

// Example 4: Simplified Post Cards
function SimplifiedPostCardsExample() {
  const posts = [
    {
      id: 1,
      title: 'New product launch announcement',
      status: 'Published',
      platform: 'Instagram',
      date: '2h ago',
    },
    {
      id: 2,
      title: 'Behind the scenes at our office',
      status: 'Draft',
      platform: 'LinkedIn',
      date: 'Yesterday',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Option 4: Simplified Post Cards</h3>
      <p className="text-sm text-gray-500">Cleaner, more compact cards for mobile</p>

      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-4">
            {/* Mobile: Stacked */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-900 line-clamp-2">{post.title}</p>
                <Badge
                  variant={post.status === 'Published' ? 'success' : 'default'}
                  className="shrink-0"
                >
                  {post.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{post.platform}</span>
                <span>·</span>
                <span>{post.date}</span>
              </div>
            </div>

            {/* Desktop: Horizontal */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg" />
                <div>
                  <p className="font-medium text-gray-900">{post.title}</p>
                  <p className="text-sm text-gray-500">
                    {post.platform} · {post.date}
                  </p>
                </div>
              </div>
              <Badge variant={post.status === 'Published' ? 'success' : 'default'}>
                {post.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 5: Hide Secondary Info
function HideSecondaryInfoExample() {
  const users = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      joined: 'Jan 15, 2024',
      lastLogin: '2 hours ago',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Option 5: Hide Secondary Info</h3>
      <p className="text-sm text-gray-500">Show only essential data on mobile</p>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {users.map((user, i) => (
          <div key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} size="sm" />
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <Badge variant="danger">{user.role}</Badge>
            </div>

            {/* Secondary info - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500">
              <span>Joined: {user.joined}</span>
              <span>Last login: {user.lastLogin}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 6: Swipe Actions
function SwipeActionsExample() {
  const [swipedId, setSwipedId] = useState<number | null>(null);
  const items = [
    { id: 1, name: 'Draft post about summer sale' },
    { id: 2, name: 'LinkedIn article draft' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Option 6: Swipe Actions</h3>
      <p className="text-sm text-gray-500">Swipe to reveal actions (tap item to toggle demo)</p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-200">
        {items.map((item) => (
          <div key={item.id} className="relative overflow-hidden">
            {/* Action buttons (revealed on swipe) */}
            <div className="absolute inset-y-0 right-0 flex">
              <button className="w-20 bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                Edit
              </button>
              <button className="w-20 bg-red-500 text-white flex items-center justify-center text-sm font-medium">
                Delete
              </button>
            </div>

            {/* Main content (slides left on swipe) */}
            <motion.div
              className="relative bg-white p-4 cursor-pointer"
              animate={{ x: swipedId === item.id ? -160 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={() => setSwipedId(swipedId === item.id ? null : item.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0" />
                <p className="font-medium text-gray-900">{item.name}</p>
              </div>
            </motion.div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">Tap an item to simulate swipe</p>
    </div>
  );
}

export function MobileExamples() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
          Mobile UI Examples
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Preview these patterns on your phone to see the mobile versions
        </p>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <DropdownTabsExample />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <BottomNavExample />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <CollapsibleFiltersExample />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <SimplifiedPostCardsExample />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <HideSecondaryInfoExample />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
          <SwipeActionsExample />
        </div>
      </div>
    </div>
  );
}
