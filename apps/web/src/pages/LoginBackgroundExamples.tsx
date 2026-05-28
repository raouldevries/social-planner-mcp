/**
 * Login Background Examples - Full screen static background previews
 */

import { useState } from 'react';

// Inline SVG icons (project doesn't use lucide-react)
function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface BackgroundOption {
  id: string;
  name: string;
  className: string;
  style?: React.CSSProperties;
}

const backgrounds: BackgroundOption[] = [
  {
    id: 'clean-white',
    name: 'Clean White',
    className: 'bg-white',
  },
  {
    id: 'subtle-gray',
    name: 'Subtle Gray Gradient',
    className: 'bg-gradient-to-b from-slate-50 to-white',
  },
  {
    id: 'cool-blue',
    name: 'Cool Blue Gradient',
    className: 'bg-gradient-to-br from-blue-50 via-white to-indigo-50',
  },
  {
    id: 'warm-gradient',
    name: 'Warm Gradient',
    className: 'bg-gradient-to-br from-orange-50 via-white to-rose-50',
  },
  {
    id: 'purple-mist',
    name: 'Purple Mist',
    className: 'bg-gradient-to-br from-violet-50 via-white to-purple-50',
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    className: 'bg-gradient-to-br from-cyan-50 via-white to-teal-50',
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    className: 'bg-gradient-to-b from-emerald-50 to-white',
  },
  {
    id: 'radial-light',
    name: 'Radial Light',
    className: 'bg-white',
    style: {
      background:
        'radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.08) 0%, rgba(255, 255, 255, 1) 70%)',
    },
  },
  {
    id: 'corner-accent',
    name: 'Corner Accent',
    className: 'bg-white',
    style: {
      background:
        'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(255, 255, 255, 1) 50%)',
    },
  },
  {
    id: 'mesh-gradient',
    name: 'Mesh Gradient',
    className: 'bg-white',
    style: {
      background: `
        radial-gradient(at 40% 20%, rgba(99, 102, 241, 0.06) 0px, transparent 50%),
        radial-gradient(at 80% 0%, rgba(236, 72, 153, 0.04) 0px, transparent 50%),
        radial-gradient(at 0% 50%, rgba(34, 197, 94, 0.04) 0px, transparent 50%),
        radial-gradient(at 80% 50%, rgba(251, 146, 60, 0.04) 0px, transparent 50%),
        radial-gradient(at 0% 100%, rgba(99, 102, 241, 0.04) 0px, transparent 50%),
        white
      `,
    },
  },
  {
    id: 'dot-pattern',
    name: 'Subtle Dot Pattern',
    className: 'bg-slate-50',
    style: {
      backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    },
  },
  {
    id: 'grid-pattern',
    name: 'Grid Pattern',
    className: 'bg-white',
    style: {
      backgroundImage: `
        linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
    },
  },
];

export function LoginBackgroundExamples() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const goToPrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? backgrounds.length - 1 : selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === backgrounds.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return;
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') setSelectedIndex(null);
  };

  // Full screen preview
  if (selectedIndex !== null) {
    const bg = backgrounds[selectedIndex];
    if (!bg) return null;
    return (
      <div
        className={`fixed inset-0 z-50 ${bg.className}`}
        style={bg.style}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Sample login form preview */}
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                <p className="text-gray-500 mt-2">Sign in to your account</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="h-11 bg-gray-50 rounded-lg border border-gray-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="h-11 bg-gray-50 rounded-lg border border-gray-200" />
                </div>
                <div className="h-11 bg-indigo-600 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation controls */}
        <div className="fixed inset-x-0 bottom-0 p-6 flex items-center justify-between bg-gradient-to-t from-black/20 to-transparent">
          <button
            onClick={goToPrevious}
            className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
            <span className="font-medium text-gray-900">{bg.name}</span>
            <span className="text-gray-500 ml-2">
              ({selectedIndex + 1} of {backgrounds.length})
            </span>
          </div>

          <button
            onClick={goToNext}
            className="p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={() => setSelectedIndex(null)}
          className="fixed top-6 right-6 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Keyboard hint */}
        <div className="fixed top-6 left-6 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg text-sm text-gray-600">
          Use ← → arrows to navigate, Esc to close
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Login Background Examples</h1>
          <p className="text-gray-600 mt-2">
            Click any background to view full screen with a sample login form
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {backgrounds.map((bg, index) => (
            <button
              key={bg.id}
              onClick={() => setSelectedIndex(index)}
              className="group relative aspect-[4/3] rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <div className={`absolute inset-0 ${bg.className}`} style={bg.style} />
              {/* Mini form preview */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-3/4 bg-white rounded-lg shadow-lg p-3 border border-gray-100">
                  <div className="h-2 w-1/2 bg-gray-200 rounded mb-2 mx-auto" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded" />
                    <div className="h-3 bg-gray-100 rounded" />
                    <div className="h-3 bg-indigo-500 rounded" />
                  </div>
                </div>
              </div>
              {/* Label */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <span className="text-white font-medium text-sm">{bg.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
