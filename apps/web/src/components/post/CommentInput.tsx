/**
 * Comment Input Component
 *
 * Text area for adding/editing comments with @ mention support.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { useUsers } from '@/hooks/useUsers';

interface CommentInputProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  placeholder?: string;
  initialValue?: string;
  replyingTo?: string;
  autoFocus?: boolean;
}

interface MentionUser {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

export function CommentInput({
  onSubmit,
  onCancel,
  isSubmitting = false,
  placeholder = 'Add a comment... Use @ to mention',
  initialValue = '',
  replyingTo,
  autoFocus = false,
}: CommentInputProps) {
  const [content, setContent] = useState(initialValue);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: usersData } = useUsers({ perPage: 100 });
  const users = usersData?.items || [];

  // Filter users based on search
  const filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Handle textarea change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setContent(value);
    setCursorPosition(position);

    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, position);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only show mentions if @ is at start or after a space, and no space after @
      const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
      if (
        (charBeforeAt === ' ' || charBeforeAt === '\n' || atIndex === 0) &&
        !textAfterAt.includes(' ')
      ) {
        setShowMentions(true);
        setMentionSearch(textAfterAt);
        setMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
    setMentionSearch('');
  }, []);

  // Handle mention selection
  const handleSelectMention = useCallback(
    (user: MentionUser) => {
      const textBeforeCursor = content.slice(0, cursorPosition);
      const textAfterCursor = content.slice(cursorPosition);
      const atIndex = textBeforeCursor.lastIndexOf('@');

      const newContent =
        textBeforeCursor.slice(0, atIndex) + `@[${user.fullName}](${user.id}) ` + textAfterCursor;

      setContent(newContent);
      setShowMentions(false);
      setMentionSearch('');

      // Focus back on textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    },
    [content, cursorPosition]
  );

  // Handle keyboard navigation in mentions
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showMentions) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (content.trim()) {
            onSubmit(content);
          }
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setMentionIndex((i) => Math.min(i + 1, filteredUsers.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setMentionIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredUsers[mentionIndex]) {
            handleSelectMention(filteredUsers[mentionIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowMentions(false);
          break;
      }
    },
    [showMentions, filteredUsers, mentionIndex, handleSelectMention, content, onSubmit]
  );

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [content]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    if (content.trim() && !isSubmitting) {
      onSubmit(content);
      setContent('');
    }
  };

  return (
    <div className="relative">
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
          <span>Replying to</span>
          <span className="font-medium text-gray-700">{replyingTo}</span>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSubmitting}
          rows={3}
          className={clsx(
            'block w-full rounded-lg border px-3 py-2 text-sm',
            'placeholder-gray-400 transition-colors resize-none',
            'focus:outline-none focus:ring-1',
            'border-gray-200 focus:border-primary-500 focus:ring-primary-500',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            'min-h-[80px]'
          )}
        />

        {/* Mention dropdown */}
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {filteredUsers.slice(0, 5).map((user, index) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectMention(user)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors',
                  index === mentionIndex && 'bg-gray-50'
                )}
              >
                <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
                <span className="text-sm text-gray-900">{user.fullName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const textarea = textareaRef.current;
              if (textarea) {
                const start = textarea.selectionStart;
                const newContent = content.slice(0, start) + '@' + content.slice(start);
                setContent(newContent);
                setCursorPosition(start + 1);
                setShowMentions(true);
                setMentionSearch('');
                textarea.focus();
              }
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Mention someone"
          >
            <AtIcon />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? <Spinner size="sm" /> : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Icons
function AtIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
      />
    </svg>
  );
}
