/**
 * Animation Examples - Perspective & Depth themed background animations
 */

import { useState } from 'react';
import { motion } from 'motion/react';

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

interface AnimationOption {
  id: string;
  name: string;
  component: React.FC;
}

// Floating Orbs Animation
const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full blur-3xl"
        style={{
          width: `${150 + i * 50}px`,
          height: `${150 + i * 50}px`,
          left: `${10 + i * 15}%`,
          top: `${20 + (i % 3) * 25}%`,
          background: `radial-gradient(circle, ${
            ['rgba(99,102,241,0.4)', 'rgba(139,92,246,0.3)', 'rgba(236,72,153,0.3)'][i % 3]
          }, transparent)`,
        }}
        animate={{
          x: [0, 30 * (i % 2 === 0 ? 1 : -1), 0],
          y: [0, 20 * (i % 2 === 0 ? -1 : 1), 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8 + i * 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

// Grid Perspective Animation
const GridPerspective = () => (
  <div className="absolute inset-0 bg-black overflow-hidden" style={{ perspective: '500px' }}>
    <motion.div
      className="absolute inset-0"
      style={{
        transformStyle: 'preserve-3d',
        rotateX: '60deg',
        backgroundImage: `
          linear-gradient(to right, rgba(99,102,241,0.3) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(99,102,241,0.3) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
      animate={{ y: [0, 60] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

// Particle Field Animation
const ParticleField = () => (
  <div className="absolute inset-0 bg-slate-950 overflow-hidden">
    {[...Array(50)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-white rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          opacity: 0.3 + Math.random() * 0.5,
        }}
        animate={{
          opacity: [0.3, 0.8, 0.3],
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 2 + Math.random() * 3,
          repeat: Infinity,
          delay: Math.random() * 2,
        }}
      />
    ))}
  </div>
);

// Aurora Animation
const Aurora = () => (
  <div className="absolute inset-0 bg-slate-950 overflow-hidden">
    <motion.div
      className="absolute inset-0 opacity-60"
      style={{
        background: `
          linear-gradient(120deg, transparent 30%, rgba(56,189,248,0.4) 40%, rgba(139,92,246,0.4) 50%, rgba(236,72,153,0.3) 60%, transparent 70%)
        `,
        backgroundSize: '200% 200%',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  </div>
);

// Morphing Shapes Animation
const MorphingShapes = () => (
  <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 to-purple-950 overflow-hidden">
    <motion.svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <motion.path
        fill="rgba(139,92,246,0.3)"
        animate={{
          d: [
            'M0,50 Q25,30 50,50 T100,50 V100 H0 Z',
            'M0,60 Q25,40 50,60 T100,40 V100 H0 Z',
            'M0,50 Q25,30 50,50 T100,50 V100 H0 Z',
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.svg>
  </div>
);

// Concentric Rings Animation
const ConcentricRings = () => (
  <div className="absolute inset-0 bg-slate-950 flex items-center justify-center overflow-hidden">
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full border border-indigo-500/30"
        style={{
          width: `${(i + 1) * 200}px`,
          height: `${(i + 1) * 200}px`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          delay: i * 0.5,
        }}
      />
    ))}
  </div>
);

const animations: AnimationOption[] = [
  { id: 'floating-orbs', name: 'Floating Orbs', component: FloatingOrbs },
  { id: 'grid-perspective', name: 'Grid Perspective', component: GridPerspective },
  { id: 'particle-field', name: 'Particle Field', component: ParticleField },
  { id: 'aurora', name: 'Aurora', component: Aurora },
  { id: 'morphing-shapes', name: 'Morphing Shapes', component: MorphingShapes },
  { id: 'concentric-rings', name: 'Concentric Rings', component: ConcentricRings },
];

export function AnimationExamples() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const goToPrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? animations.length - 1 : selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === animations.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return;
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') setSelectedIndex(null);
  };

  if (selectedIndex !== null) {
    const anim = animations[selectedIndex];
    if (!anim) return null;
    const AnimComponent = anim.component;
    return (
      <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown} tabIndex={0}>
        <AnimComponent />

        {/* Navigation */}
        <div className="fixed inset-x-0 bottom-0 p-6 flex items-center justify-between">
          <button
            onClick={goToPrevious}
            className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
            <span className="font-medium text-white">{anim.name}</span>
            <span className="text-white/60 ml-2">
              ({selectedIndex + 1} of {animations.length})
            </span>
          </div>

          <button
            onClick={goToNext}
            className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        <button
          onClick={() => setSelectedIndex(null)}
          className="fixed top-6 right-6 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="fixed top-6 left-6 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-white/80">
          Use ← → arrows to navigate, Esc to close
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Animation Examples</h1>
          <p className="text-gray-600 mt-2">Click any animation to view full screen</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {animations.map((anim, index) => {
            const AnimComponent = anim.component;
            return (
              <button
                key={anim.id}
                onClick={() => setSelectedIndex(index)}
                className="group relative aspect-video rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <AnimComponent />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <span className="text-white font-medium text-sm">{anim.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
