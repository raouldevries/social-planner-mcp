/**
 * Media Uploader
 *
 * Drag-and-drop file upload component with progress indication.
 */

import { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
};

const MAX_FILE_SIZE_IMAGE = 50 * 1024 * 1024; // 50MB
const MAX_FILE_SIZE_VIDEO = 500 * 1024 * 1024; // 500MB
const MAX_FILES = 10;

interface MediaUploaderProps {
  onUpload: (files: File[]) => void;
  uploading?: boolean;
  multiple?: boolean;
  compact?: boolean;
}

export function MediaUploader({
  onUpload,
  uploading = false,
  multiple = true,
  compact = false,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: FileList | File[]): File[] => {
    const validFiles: File[] = [];
    const newErrors: string[] = [];
    const fileArray: File[] = [];

    // Convert FileList to File array
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) fileArray.push(file);
    }

    if (fileArray.length > MAX_FILES) {
      newErrors.push(`Maximum ${MAX_FILES} files allowed at once`);
      setErrors(newErrors);
      return [];
    }

    for (const file of fileArray) {
      // Check file type
      if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
        newErrors.push(`${file.name}: Unsupported file type`);
        continue;
      }

      // Check file size
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? MAX_FILE_SIZE_VIDEO : MAX_FILE_SIZE_IMAGE;
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        newErrors.push(`${file.name}: File too large (max ${maxSizeMB}MB)`);
        continue;
      }

      validFiles.push(file);
    }

    setErrors(newErrors);
    return validFiles;
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (uploading) return;

      const files = e.dataTransfer.files;
      const validFiles = validateFiles(files);
      const firstFile = validFiles[0];

      if (validFiles.length > 0 && firstFile) {
        onUpload(multiple ? validFiles : [firstFile]);
      }
    },
    [uploading, validateFiles, onUpload, multiple]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (uploading || !e.target.files) return;

      const validFiles = validateFiles(e.target.files);
      const firstFile = validFiles[0];

      if (validFiles.length > 0 && firstFile) {
        onUpload(multiple ? validFiles : [firstFile]);
      }

      // Reset input
      e.target.value = '';
    },
    [uploading, validateFiles, onUpload, multiple]
  );

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const acceptString = Object.entries(ACCEPTED_TYPES)
    .flatMap(([mime, exts]) => [mime, ...exts])
    .join(',');

  const inputId = `media-upload-${compact ? 'compact' : 'full'}`;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          Upload media files
        </label>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          aria-describedby={errors.length > 0 ? `${inputId}-error` : undefined}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleButtonClick}
          disabled={uploading}
          aria-label="Upload media files"
        >
          {uploading ? (
            <Spinner size="sm" />
          ) : (
            <UploadIcon className="w-4 h-4 mr-1" aria-hidden="true" />
          )}
          Upload
        </Button>
        {errors.length > 0 && (
          <span id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
            {errors[0]}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="sr-only">
        Upload media files
      </label>
      <motion.div
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-8 text-center',
          isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400',
          uploading && 'opacity-50 cursor-not-allowed'
        )}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? 'rgb(59, 130, 246)' : 'rgb(209, 213, 219)',
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="region"
        aria-label="File upload drop zone"
      >
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          aria-describedby={errors.length > 0 ? `${inputId}-errors` : undefined}
        />

        <div className="flex flex-col items-center">
          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center"
              >
                <Spinner size="lg" />
                <p className="mt-4 text-sm text-gray-600" aria-live="polite">
                  Uploading...
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{ y: isDragging ? -8 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <UploadCloudIcon
                    className={clsx(
                      'w-12 h-12 mb-4 transition-colors duration-200',
                      isDragging ? 'text-primary-500' : 'text-gray-400'
                    )}
                    aria-hidden="true"
                  />
                </motion.div>
                <motion.p
                  className="text-sm text-gray-600 mb-2"
                  animate={{ opacity: isDragging ? 0.7 : 1 }}
                >
                  {isDragging ? (
                    <span className="font-medium text-primary-600">Drop to upload</span>
                  ) : (
                    <>
                      <span className="font-medium">Drop files here</span> or{' '}
                      <button
                        type="button"
                        onClick={handleButtonClick}
                        className="text-primary-600 hover:text-primary-700 font-medium underline"
                      >
                        browse
                      </button>
                    </>
                  )}
                </motion.p>
                <p className="text-xs text-gray-500">
                  Images (JPEG, PNG, GIF, WebP) up to 50MB
                  <br />
                  Videos (MP4, MOV, WebM) up to 500MB
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Errors with animation */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            id={`${inputId}-errors`}
            className="space-y-1"
            role="alert"
            aria-live="polite"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {errors.map((error) => (
              <p key={error} className="text-sm text-red-600">
                {error}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Icons
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function UploadCloudIcon({ className }: { className?: string }) {
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
        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
      />
    </svg>
  );
}
