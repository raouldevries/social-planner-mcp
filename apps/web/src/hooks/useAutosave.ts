/**
 * useAutosave Hook
 *
 * Handles auto-saving content with debounce, retry logic, and offline detection.
 * Designed for the PostEditor component.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

// ============================================
// TYPES
// ============================================

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface AutosaveResponse {
  success: boolean;
  savedAt: string;
  updatedAt: string;
  conflict?: boolean;
  serverContent?: string;
}

interface AutosaveError {
  code?: string;
  message?: string;
  conflict?: boolean;
  serverContent?: string;
  serverUpdatedAt?: string;
}

interface UseAutosaveOptions {
  postId: string | null;
  debounceMs?: number;
  maxRetries?: number;
  onConflict?: (serverContent: string, serverUpdatedAt: string) => void;
  onSaved?: (content: string) => void;
  enabled?: boolean;
}

interface UseAutosaveReturn {
  status: AutosaveStatus;
  lastSaved: Date | null;
  lastModified: string | null;
  error: string | null;
  save: (content: string) => void;
  saveImmediate: (content: string) => Promise<void>;
  retry: () => void;
  isOnline: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_DEBOUNCE_MS = 800;
const DEFAULT_MAX_RETRIES = 3;
const SAVED_DISPLAY_MS = 2000;
const ERROR_DISPLAY_MS = 3000;

// ============================================
// HOOK
// ============================================

export function useAutosave({
  postId,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
  onConflict,
  onSaved,
  enabled = true,
}: UseAutosaveOptions): UseAutosaveReturn {
  // State
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Refs
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const pendingContentRef = useRef<string | null>(null);
  const lastSavedContentRef = useRef<string | null>(null);

  // ============================================
  // ONLINE/OFFLINE DETECTION
  // ============================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // If we have pending content, save it
      if (pendingContentRef.current !== null && status === 'offline') {
        performSave(pendingContentRef.current);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status]);

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  // ============================================
  // SAVE LOGIC
  // ============================================

  const performSave = useCallback(
    async (content: string) => {
      if (!postId || !enabled) return;

      // Check online status
      if (!navigator.onLine) {
        setStatus('offline');
        pendingContentRef.current = content;
        return;
      }

      // Skip if content hasn't changed since last save
      if (content === lastSavedContentRef.current) {
        return;
      }

      setStatus('saving');
      setError(null);

      try {
        const response = await api.post<AutosaveResponse>(`/posts/${postId}/autosave`, {
          baseContent: content,
          lastModified: lastModified,
        });

        // Success
        retryCountRef.current = 0;
        lastSavedContentRef.current = content;
        pendingContentRef.current = null;
        setLastSaved(new Date(response.data.savedAt));
        setLastModified(response.data.updatedAt);
        setStatus('saved');
        onSaved?.(content);

        // Reset to idle after delay
        statusTimeoutRef.current = setTimeout(() => {
          setStatus('idle');
        }, SAVED_DISPLAY_MS);
      } catch (err: unknown) {
        const axiosError = err as { response?: { status?: number; data?: AutosaveError } };

        // Handle conflict (409)
        if (axiosError.response?.status === 409) {
          const conflictData = axiosError.response.data;
          if (conflictData?.serverContent && conflictData?.serverUpdatedAt && onConflict) {
            onConflict(conflictData.serverContent, conflictData.serverUpdatedAt);
          }
          setError('Post was modified elsewhere');
          setStatus('error');
          statusTimeoutRef.current = setTimeout(() => {
            setStatus('idle');
          }, ERROR_DISPLAY_MS);
          return;
        }

        // Retry logic with exponential backoff
        retryCountRef.current += 1;

        if (retryCountRef.current < maxRetries) {
          const backoffMs = retryCountRef.current * 1000;
          setTimeout(() => {
            performSave(content);
          }, backoffMs);
          return;
        }

        // Max retries reached
        setError('Failed to save');
        setStatus('error');
        pendingContentRef.current = content;

        statusTimeoutRef.current = setTimeout(() => {
          setStatus('idle');
        }, ERROR_DISPLAY_MS);
      }
    },
    [postId, enabled, lastModified, maxRetries, onConflict, onSaved]
  );

  // ============================================
  // DEBOUNCED SAVE
  // ============================================

  const save = useCallback(
    (content: string) => {
      if (!enabled) return;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Clear status timeout if pending
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }

      // Store pending content
      pendingContentRef.current = content;

      // Show "Saving..." immediately when content changes (if different from last saved)
      if (content !== lastSavedContentRef.current) {
        setStatus('saving');
      }

      // Start new debounce timer
      timeoutRef.current = setTimeout(() => {
        performSave(content);
      }, debounceMs);
    },
    [enabled, debounceMs, performSave]
  );

  // ============================================
  // IMMEDIATE SAVE (for blur/navigation)
  // ============================================

  const saveImmediate = useCallback(
    async (content: string) => {
      if (!enabled) return;

      // Clear any pending debounce
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Only save if content changed
      if (content !== lastSavedContentRef.current) {
        await performSave(content);
      }
    },
    [enabled, performSave]
  );

  // ============================================
  // MANUAL RETRY
  // ============================================

  const retry = useCallback(() => {
    retryCountRef.current = 0;
    if (pendingContentRef.current !== null) {
      performSave(pendingContentRef.current);
    }
  }, [performSave]);

  // ============================================
  // UPDATE LAST MODIFIED FROM EXTERNAL SOURCE
  // ============================================

  // When post data is loaded, update lastModified
  useEffect(() => {
    // Reset state when postId changes
    setStatus('idle');
    setLastSaved(null);
    setError(null);
    lastSavedContentRef.current = null;
    pendingContentRef.current = null;
    retryCountRef.current = 0;
  }, [postId]);

  return {
    status,
    lastSaved,
    lastModified,
    error,
    save,
    saveImmediate,
    retry,
    isOnline,
  };
}

// ============================================
// HELPER: Set last modified from server data
// ============================================

export function useSetAutosaveLastModified(setLastModified: (value: string | null) => void) {
  return useCallback(
    (updatedAt: string | null) => {
      setLastModified(updatedAt);
    },
    [setLastModified]
  );
}
