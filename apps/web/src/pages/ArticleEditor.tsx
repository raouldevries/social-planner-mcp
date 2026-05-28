/**
 * Article Editor Page
 *
 * Full-featured article editor with rich text editing, title, featured image,
 * word count, autosave, and publish/unpublish functionality.
 *
 * Design principles (Apple-inspired):
 * - Clean, minimal interface with focus on content
 * - Subtle shadows and transitions throughout
 * - Touch-friendly controls with 44px minimum targets
 * - Muted neutral color palette for reduced visual noise
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { format, parse } from 'date-fns';
import { ARTICLE_STATUS } from '@social-planner/shared';
import {
  useArticle,
  useCreateArticle,
  useUpdateArticle,
  useDeleteArticle,
  usePublishArticle,
  useUnpublishArticle,
} from '@/hooks/useArticle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { DatePicker, TimePicker } from '@/components/ui';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isNew = !id || id === 'new';

  // Fetch article data if editing
  const {
    data: article,
    isLoading: isLoadingArticle,
    isError: isArticleError,
  } = useArticle(isNew ? undefined : id);

  // Mutations
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle(id || '');
  const deleteArticle = useDeleteArticle();
  const publishArticle = usePublishArticle(id || '');
  const unpublishArticle = useUnpublishArticle(id || '');

  // Form state
  const [title, setTitle] = useState('');
  const [plannedAt, setPlannedAt] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Date/time picker state (split from plannedAt for UI)
  const [plannedDate, setPlannedDate] = useState<string>('');
  const [plannedTime, setPlannedTime] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // UI state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Ref for click-outside detection on date/time pickers
  const dateTimePickerRef = useRef<HTMLDivElement>(null);

  // Refs for autosave
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveRef = useRef<(() => void) | null>(null);

  // Tiptap editor with extended features for articles
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your article...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 hover:underline',
        },
      }),
      Underline,
    ],
    content: '',
    onUpdate: () => {
      setHasUnsavedChanges(true);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[400px]',
      },
    },
  });

  // Initialize form from article data
  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setPlannedAt(article.plannedAt || '');
      // Parse plannedAt into date and time for the picker UI
      if (article.plannedAt) {
        const parsed = new Date(article.plannedAt);
        setPlannedDate(format(parsed, 'yyyy-MM-dd'));
        setPlannedTime(format(parsed, 'HH:mm'));
      }
      if (editor && article.content) {
        editor.commands.setContent(article.content);
      }
    }
  }, [article, editor]);

  // Close date/time pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateTimePickerRef.current && !dateTimePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
        setShowTimePicker(false);
      }
    };

    if (showDatePicker || showTimePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker, showTimePicker]);

  // Handlers (defined early so we can use saveRef)
  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    const content = editor?.getHTML() || '';

    // Validate title
    if (!trimmedTitle) {
      toast.error('Title is required');
      return;
    }

    if (isNew) {
      createArticle.mutate({
        title: trimmedTitle,
        content,
        ...(plannedAt && { plannedAt }),
      });
    } else {
      updateArticle.mutate({
        title: trimmedTitle,
        content,
        plannedAt: plannedAt || null,
      });
      setHasUnsavedChanges(false);
    }
  }, [isNew, title, editor, plannedAt, createArticle, updateArticle]);

  // Keep saveRef in sync with handleSave
  useEffect(() => {
    saveRef.current = handleSave;
  }, [handleSave]);

  // Autosave effect
  useEffect(() => {
    if (!isNew && hasUnsavedChanges && !updateArticle.isPending) {
      // Clear existing timer
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      // Set new autosave timer (30 seconds)
      autosaveTimerRef.current = setTimeout(() => {
        saveRef.current?.();
      }, 30000);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, isNew, updateArticle.isPending]);

  // Derived state
  const isPublished = article?.status === ARTICLE_STATUS.PUBLISHED;
  const canPublish = !isNew && title.trim().length > 0 && editor?.getText().trim().length;
  const canUnpublish = isPublished;
  const canDelete = !isNew;

  // Word count
  const wordCount = editor?.getText().split(/\s+/).filter(Boolean).length || 0;

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasUnsavedChanges(true);
  }, []);

  // Handle date change from DatePicker
  const handlePlannedDateChange = useCallback(
    (newDate: string) => {
      setPlannedDate(newDate);
      if (newDate && plannedTime) {
        const combined = new Date(`${newDate}T${plannedTime}`);
        if (!isNaN(combined.getTime())) {
          setPlannedAt(combined.toISOString());
        }
      } else if (newDate && !plannedTime) {
        // Default to 09:00 if no time set
        const defaultTime = '09:00';
        setPlannedTime(defaultTime);
        const combined = new Date(`${newDate}T${defaultTime}`);
        if (!isNaN(combined.getTime())) {
          setPlannedAt(combined.toISOString());
        }
      }
      setHasUnsavedChanges(true);
    },
    [plannedTime]
  );

  // Handle time change from TimePicker
  const handlePlannedTimeChange = useCallback(
    (hours: number, minutes: number) => {
      const newTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      setPlannedTime(newTime);
      if (plannedDate && newTime) {
        const combined = new Date(`${plannedDate}T${newTime}`);
        if (!isNaN(combined.getTime())) {
          setPlannedAt(combined.toISOString());
        }
      }
      setHasUnsavedChanges(true);
    },
    [plannedDate]
  );

  // Clear planned date/time
  const handleClearPlannedDate = useCallback(() => {
    setPlannedAt('');
    setPlannedDate('');
    setPlannedTime('');
    setHasUnsavedChanges(true);
  }, []);

  const handlePublish = useCallback(() => {
    publishArticle.mutate();
  }, [publishArticle]);

  const handleUnpublish = useCallback(() => {
    unpublishArticle.mutate();
  }, [unpublishArticle]);

  const handleDelete = useCallback(() => {
    if (id) {
      deleteArticle.mutate(id);
    }
  }, [deleteArticle, id]);

  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL');
    if (!url || !editor) return;

    // Trim and validate URL
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    // Block dangerous protocols
    const lowerUrl = trimmedUrl.toLowerCase();
    if (
      lowerUrl.startsWith('javascript:') ||
      lowerUrl.startsWith('data:') ||
      lowerUrl.startsWith('vbscript:')
    ) {
      return;
    }

    // Add protocol if missing
    let safeUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      safeUrl = `https://${trimmedUrl}`;
    }

    editor.chain().focus().setLink({ href: safeUrl }).run();
  }, [editor]);

  // Loading state
  if (!isNew && isLoadingArticle) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (!isNew && isArticleError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-neutral-600 mb-4">Article not found or failed to load</p>
          <Button variant="secondary" onClick={() => navigate('/articles')}>
            Back to Articles
          </Button>
        </div>
      </div>
    );
  }

  const isSaving = createArticle.isPending || updateArticle.isPending;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div
        className="flex items-center justify-between mb-6"
        data-feedback-target="article-editor-header"
        data-feedback-label="Article Editor Header"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/articles')}
            className={clsx(
              'p-2.5 rounded-xl',
              'text-neutral-500 hover:text-neutral-700',
              'hover:bg-neutral-100 active:bg-neutral-200',
              'transition-all duration-200 ease-out'
            )}
            aria-label="Back to articles"
          >
            <BackIcon />
          </button>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            {isNew ? 'New Article' : 'Edit Article'}
          </h1>
          {article && (
            <span
              className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium',
                'transition-colors duration-200',
                isPublished ? 'bg-green-50 text-green-600' : 'bg-neutral-100 text-neutral-500'
              )}
            >
              {isPublished ? 'Published' : 'Draft'}
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs text-neutral-400 animate-pulse">Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(true)}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Spinner size="sm" /> : 'Save'}
          </Button>
          {canUnpublish && (
            <Button
              variant="secondary"
              onClick={handleUnpublish}
              disabled={unpublishArticle.isPending}
            >
              Unpublish
            </Button>
          )}
          {canPublish && !isPublished && (
            <Button variant="primary" onClick={handlePublish} disabled={publishArticle.isPending}>
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Title */}
      <div
        className="mb-6"
        data-feedback-target="article-editor-title"
        data-feedback-label="Article Title"
      >
        <label htmlFor="article-title" className="sr-only">
          Article title
        </label>
        <div
          className={clsx(
            'bg-white rounded-xl px-6 py-4',
            'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]',
            'transition-shadow duration-300',
            'focus-within:shadow-[0_4px_6px_rgba(0,0,0,0.07),0_2px_4px_rgba(0,0,0,0.05)]'
          )}
        >
          <Input
            id="article-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Article title..."
            className={clsx(
              'text-2xl font-semibold tracking-tight',
              '!border-none !rounded-none !px-0 !shadow-none !bg-transparent',
              'focus:!ring-0 focus:!ring-offset-0',
              'placeholder:text-neutral-300'
            )}
          />
        </div>
      </div>

      {/* Planned Date */}
      <div
        className="mb-6"
        data-feedback-target="article-editor-planned-date"
        data-feedback-label="Planned Date"
      >
        <label className="block text-sm font-medium text-neutral-600 mb-2">Planned Date</label>
        <div ref={dateTimePickerRef} className="relative">
          <div className="flex items-center gap-3">
            {/* Date display with calendar toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowDatePicker(!showDatePicker);
                  if (!showDatePicker) setShowTimePicker(false);
                }}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  showDatePicker
                    ? 'bg-primary-50 text-primary-600'
                    : 'hover:bg-neutral-100 text-neutral-700',
                  !plannedDate && 'text-neutral-400'
                )}
              >
                <span className="text-base font-medium tabular-nums whitespace-nowrap">
                  {plannedDate
                    ? format(parse(plannedDate, 'yyyy-MM-dd', new Date()), 'd MMM yyyy')
                    : 'Select date'}
                </span>
                <CalendarIcon />
              </button>

              {/* Date picker popover */}
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 z-50">
                  <DatePicker
                    value={plannedDate ? parse(plannedDate, 'yyyy-MM-dd', new Date()) : null}
                    onChange={(newDate) => {
                      const formatted = format(newDate, 'yyyy-MM-dd');
                      handlePlannedDateChange(formatted);
                      setShowDatePicker(false);
                    }}
                    label="Select date"
                  />
                </div>
              )}
            </div>

            {/* Time display with clock toggle - only show if date is set */}
            {plannedDate && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowTimePicker(!showTimePicker);
                    if (!showTimePicker) setShowDatePicker(false);
                  }}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    showTimePicker
                      ? 'bg-primary-50 text-primary-600'
                      : 'hover:bg-neutral-100 text-neutral-700'
                  )}
                >
                  <span className="text-base font-medium tabular-nums">
                    {plannedTime || '09:00'}
                  </span>
                  <ClockIcon />
                </button>

                {/* Time picker popover */}
                {showTimePicker && (
                  <div className="absolute top-full left-0 mt-2 z-50">
                    <TimePicker
                      hours={plannedTime ? parseInt(plannedTime.split(':')[0] || '9', 10) : 9}
                      minutes={plannedTime ? parseInt(plannedTime.split(':')[1] || '0', 10) : 0}
                      onChange={handlePlannedTimeChange}
                      label="Select time"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Clear button */}
            {plannedAt && (
              <button
                type="button"
                onClick={handleClearPlannedDate}
                className={clsx(
                  'p-1.5 rounded-lg',
                  'text-neutral-400 hover:text-neutral-600',
                  'hover:bg-neutral-100 active:bg-neutral-200',
                  'transition-colors duration-150'
                )}
                title="Clear planned date"
              >
                <ClearIcon />
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          When do you plan to work on this article? It will appear on the calendar.
        </p>
      </div>

      {/* Editor toolbar */}
      <div
        className={clsx(
          'flex flex-wrap items-center gap-0.5 mb-4 p-1.5',
          'bg-neutral-50 rounded-xl',
          'border border-neutral-100'
        )}
        data-feedback-target="article-editor-toolbar"
        data-feedback-label="Editor Toolbar"
      >
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor?.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor?.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}
          active={editor?.isActive('heading', { level: 4 })}
          title="Heading 4"
        >
          H4
        </ToolbarButton>

        <div className="w-px h-5 bg-neutral-200 mx-1.5" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive('bold')}
          title="Bold"
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive('italic')}
          title="Italic"
        >
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          active={editor?.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          active={editor?.isActive('strike')}
          title="Strikethrough"
        >
          <StrikeIcon />
        </ToolbarButton>

        <div className="w-px h-5 bg-neutral-200 mx-1.5" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive('bulletList')}
          title="Bullet List"
        >
          <BulletListIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive('orderedList')}
          title="Numbered List"
        >
          <NumberedListIcon />
        </ToolbarButton>

        <div className="w-px h-5 bg-neutral-200 mx-1.5" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive('blockquote')}
          title="Blockquote"
        >
          <BlockquoteIcon />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          active={editor?.isActive('codeBlock')}
          title="Code Block"
        >
          <CodeIcon />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} active={editor?.isActive('link')} title="Link">
          <LinkIcon />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <div
        className={clsx(
          'bg-white rounded-xl p-6 min-h-[500px]',
          'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]',
          'transition-shadow duration-300',
          'focus-within:shadow-[0_4px_6px_rgba(0,0,0,0.07),0_2px_4px_rgba(0,0,0,0.05)]'
        )}
        data-feedback-target="article-editor-content"
        data-feedback-label="Article Content"
      >
        <EditorContent editor={editor} />
      </div>

      {/* Word count */}
      <div className="flex justify-end mt-3 text-sm text-neutral-400 tabular-nums">
        {wordCount.toLocaleString()} words
      </div>

      {/* Delete confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Article"
      >
        <div className="space-y-4">
          <p className="text-neutral-600 leading-relaxed">
            Are you sure you want to delete this article? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteArticle.isPending}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteArticle.isPending}>
              {deleteArticle.isPending ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Toolbar button component
interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean | undefined;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        'p-2 rounded-lg text-sm font-medium',
        'transition-all duration-150 ease-out',
        'min-w-[32px] min-h-[32px]',
        'flex items-center justify-center',
        active
          ? 'bg-white text-primary-600 shadow-sm'
          : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/60 active:bg-white'
      )}
    >
      {children}
    </button>
  );
}

// Icons
function BackIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function BoldIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" />
    </svg>
  );
}

function StrikeIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
    </svg>
  );
}

function BlockquoteIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="w-5 h-5"
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

function ClockIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
