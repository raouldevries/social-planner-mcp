/**
 * Rich Text Editor
 *
 * Tiptap-based rich text editor with toolbar, character count,
 * and integrated media section.
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { clsx } from 'clsx';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import type { PostMediaItem } from '@social-planner/shared';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import type { AutosaveStatus } from '@/hooks/useAutosave';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlur?: () => void;
  placeholder?: string | undefined;
  characterLimit?: number | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  // Media props
  media?: PostMediaItem[];
  onMediaRemove?: (mediaId: string) => void;
  onMediaReorder?: (newOrder: PostMediaItem[]) => void;
  onOpenMediaLibrary?: () => void;
  // Autosave props
  autosaveStatus?: AutosaveStatus;
  autosaveError?: string | null;
  onAutosaveRetry?: () => void;
}

export function RichTextEditor({
  content,
  onChange,
  onBlur,
  placeholder = 'Write your post...',
  characterLimit,
  disabled = false,
  className,
  media = [],
  onMediaRemove,
  onMediaReorder,
  onOpenMediaLibrary,
  autosaveStatus,
  autosaveError,
  onAutosaveRetry,
}: RichTextEditorProps) {
  // Track whether we're currently updating from props to prevent loops
  const isUpdatingFromProps = useRef(false);
  // Track the current content prop to prevent stale closure in onUpdate
  const contentRef = useRef(content);
  contentRef.current = content;
  // Track the last text output by the editor to distinguish editor changes from external changes
  const lastEditorOutputRef = useRef<string | null>(null);

  // Convert plain text to HTML for Tiptap
  // Split on '\n' matching getText({ blockSeparator: '\n' })
  // Use <p></p> for empty lines (NOT <p><br></p> which Tiptap treats as a hardBreak)
  const contentToHtml = (text: string): string => {
    if (!text) return '<p></p>';
    return text
      .split('\n')
      .map((line) => (line ? `<p>${line}</p>` : '<p></p>'))
      .join('');
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      CharacterCount.configure({
        limit: characterLimit,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 underline',
        },
      }),
    ],
    content: '',
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      // Don't fire onChange if we're updating from props
      if (isUpdatingFromProps.current) return;
      const newText = e.getText({ blockSeparator: '\n' });
      lastEditorOutputRef.current = newText;
      // Only call onChange if text actually changed from current content prop
      if (newText !== contentRef.current) {
        onChange(newText);
      }
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  // Sync content from external sources (post load, conflict resolution)
  // Skip if the content came from the editor itself (user typing)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    // If this content was produced by the editor's onUpdate, skip syncing
    if (content === lastEditorOutputRef.current) return;

    // External content change — convert and set in editor
    isUpdatingFromProps.current = true;
    const htmlContent = contentToHtml(content);
    editor.commands.setContent(htmlContent);
    // Update ref so we don't re-sync the same content
    lastEditorOutputRef.current = content;
    isUpdatingFromProps.current = false;
  }, [content, editor]);

  // Sync disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  const characterCount = editor?.storage.characterCount.characters() ?? 0;
  const characterPercentage = characterLimit ? (characterCount / characterLimit) * 100 : 0;
  const showCharacterCount = !!characterLimit; // Always show when there's a limit

  // Character status: safe, warning, critical, over
  const getCharacterStatus = () => {
    if (characterPercentage >= 100) return 'over';
    if (characterPercentage >= 95) return 'critical';
    if (characterPercentage >= 80) return 'warning';
    return 'safe';
  };

  const characterStatus = getCharacterStatus();

  // Subtle opacity that increases as you approach the limit
  const getCounterOpacity = () => {
    if (characterPercentage >= 80) return 1;
    return 0.6;
  };

  const getCharacterCountColor = () => {
    if (characterStatus === 'over') return 'text-red-500';
    if (characterStatus === 'critical') return 'text-red-400';
    if (characterStatus === 'warning') return 'text-amber-500';
    return 'text-neutral-400';
  };

  const getProgressBarColor = () => {
    if (characterStatus === 'over') return 'bg-red-500';
    if (characterStatus === 'critical') return 'bg-red-500';
    if (characterStatus === 'warning') return 'bg-amber-500';
    return 'bg-neutral-300';
  };

  const hasMedia = media.length > 0;

  return (
    <div className={clsx('flex flex-col', className)}>
      {/* Compact toolbar bar - Add media left, character count right */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-2 border-b border-gray-100">
        {/* Left: Add media button */}
        {onOpenMediaLibrary ? (
          <button
            type="button"
            onClick={onOpenMediaLibrary}
            disabled={disabled}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 -ml-3 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-sm">Add media</span>
          </button>
        ) : (
          <div />
        )}

        {/* Right: Autosave indicator + Character count */}
        <div className="flex items-center gap-3">
          {/* Autosave indicator */}
          {autosaveStatus && autosaveStatus !== 'idle' && (
            <AutoSaveIndicator
              status={autosaveStatus}
              error={autosaveError ?? null}
              {...(onAutosaveRetry && { onRetry: onAutosaveRetry })}
            />
          )}

          {/* Character count with progress bar */}
          <AnimatePresence>
            {showCharacterCount && (
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: getCounterOpacity() }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Progress bar - subtle and thin */}
                <div className="w-16 h-1 bg-neutral-200 rounded-full overflow-hidden">
                  <motion.div
                    className={clsx('h-full rounded-full', getProgressBarColor())}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(characterPercentage, 100)}%` }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>

                {/* Counter */}
                <motion.span
                  className={clsx('text-xs tabular-nums', getCharacterCountColor())}
                  animate={
                    characterStatus === 'over'
                      ? {
                          x: [0, -2, 2, -2, 2, 0],
                          transition: { duration: 0.4, ease: 'easeInOut' },
                        }
                      : characterStatus === 'critical'
                        ? {
                            scale: [1, 1.05, 1],
                            transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
                          }
                        : {}
                  }
                  key={characterStatus}
                >
                  {characterCount.toLocaleString()} / {characterLimit?.toLocaleString()}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Editor area */}
      <div
        className={clsx(
          'bg-white',
          'min-h-[320px] overflow-y-auto',
          disabled && 'bg-gray-50 cursor-not-allowed'
        )}
      >
        <EditorContent
          editor={editor}
          className={clsx(
            'prose prose-sm max-w-none px-4 lg:px-6 py-4 lg:py-6',
            '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]',
            '[&_.ProseMirror]:text-base [&_.ProseMirror]:leading-relaxed',
            '[&_.ProseMirror:focus]:outline-none [&_.ProseMirror:focus]:ring-0 [&_.ProseMirror:focus]:shadow-none',
            '[&_.ProseMirror:focus-visible]:outline-none [&_.ProseMirror:focus-visible]:ring-0 [&_.ProseMirror:focus-visible]:shadow-none',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0'
          )}
        />
      </div>

      {/* Media section - only shows when media exists */}
      {hasMedia && (
        <div className="px-4 lg:px-6 py-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            <Reorder.Group
              axis="x"
              values={media}
              onReorder={(newOrder) => onMediaReorder?.(newOrder)}
              className="contents"
            >
              {media.map((item) => (
                <MediaThumbnail
                  key={item.id}
                  item={item}
                  onRemove={() => onMediaRemove?.(item.mediaAssetId)}
                  disabled={disabled}
                />
              ))}
            </Reorder.Group>
            {/* Add more button */}
            {!disabled && onOpenMediaLibrary && (
              <button
                type="button"
                onClick={onOpenMediaLibrary}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                title="Add media"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Media thumbnail component
interface MediaThumbnailProps {
  item: PostMediaItem;
  onRemove: () => void;
  disabled?: boolean;
}

function MediaThumbnail({ item, onRemove, disabled }: MediaThumbnailProps) {
  const isVideo = item.fileType.startsWith('video/');

  return (
    <Reorder.Item
      value={item}
      drag={!disabled}
      className={clsx(
        'relative group w-16 h-16 rounded-lg overflow-hidden bg-gray-200',
        !disabled && 'cursor-grab active:cursor-grabbing'
      )}
      {...(!disabled && { whileDrag: { scale: 1.05, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } })}
    >
      {isVideo ? (
        <div className="w-full h-full flex items-center justify-center">
          <VideoIcon className="w-5 h-5 text-gray-400" />
        </div>
      ) : (
        <img
          src={item.thumbnailUrl || item.url}
          alt={item.altText || item.fileName}
          className="w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* Remove button - larger touch target on mobile */}
      {!disabled && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className={clsx(
            'absolute -top-1 -right-1 p-1.5 rounded-full',
            'bg-black/70 text-white',
            'sm:opacity-0 sm:group-hover:opacity-100',
            'transition-opacity duration-150 hover:bg-black/90',
            'focus:opacity-100 focus:outline-none',
            'min-w-[28px] min-h-[28px] flex items-center justify-center'
          )}
          title="Remove"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Video indicator */}
      {isVideo && (
        <div className="absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
          Video
        </div>
      )}
    </Reorder.Item>
  );
}

// Icons
function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className || 'w-4 h-4'}
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

function VideoIcon({ className }: { className?: string }) {
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
        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
