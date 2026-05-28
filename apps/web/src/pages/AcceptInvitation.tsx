/**
 * Social Planner - Accept Invitation Page
 *
 * Allows invited users to create their account and join the workspace.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { useValidateInvitation, useAcceptInvitation } from '@/hooks/useInvitations';
import { useIsAuthenticated } from '@/stores/authStore';
import { Card, CardBody, Spinner } from '@/components/ui';

const acceptInvitationSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

export function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const isAuthenticated = useIsAuthenticated();
  const [focused, setFocused] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const lastSubmitCount = useRef(0);

  // Validate the invitation token
  const {
    data: validation,
    isLoading: isValidating,
    error: validationError,
  } = useValidateInvitation(token || '');

  // Accept invitation mutation
  const acceptMutation = useAcceptInvitation(token || '');

  const {
    register,
    handleSubmit,
    formState: { errors, submitCount },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
  });

  const hasErrors = Object.keys(errors).length > 0;

  // Trigger shake animation on validation errors
  useEffect(() => {
    if (submitCount > lastSubmitCount.current && hasErrors) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 600);
      lastSubmitCount.current = submitCount;
      return () => clearTimeout(timer);
    }
    lastSubmitCount.current = submitCount;
  }, [submitCount, hasErrors]);

  // Show success animation when accept succeeds
  useEffect(() => {
    if (acceptMutation.isSuccess) {
      setShowSuccess(true);
    }
  }, [acceptMutation.isSuccess]);

  // Redirect if already authenticated
  if (isAuthenticated && !showSuccess) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = (data: AcceptInvitationFormData) => {
    acceptMutation.mutate({
      fullName: data.fullName,
      password: data.password,
    });
  };

  const blurRevealVariants = {
    hidden: { opacity: 0, filter: 'blur(8px)' },
    visible: { opacity: 1, filter: 'blur(0px)' },
  };

  const isLoading = acceptMutation.isPending;

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Validating invitation...</p>
        </motion.div>
      </div>
    );
  }

  // Show error state if validation failed
  if (validationError || !validation?.valid) {
    const reason = validation?.reason || 'invalid';
    const errorMessages: Record<string, { title: string; message: string }> = {
      invalid: {
        title: 'Invalid Invitation',
        message:
          'This invitation link is not valid. Please check the link or contact an administrator.',
      },
      expired: {
        title: 'Invitation Expired',
        message:
          'This invitation has expired. Please contact an administrator for a new invitation.',
      },
      already_used: {
        title: 'Already Used',
        message:
          'This invitation has already been used. If you already have an account, please sign in.',
      },
      revoked: {
        title: 'Invitation Revoked',
        message:
          'This invitation has been revoked. Please contact an administrator for a new invitation.',
      },
    };

    const errorInfo = errorMessages[reason] ??
      errorMessages.invalid ?? { title: 'Error', message: 'An error occurred' };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full px-4"
        >
          <Card className="shadow-xl bg-white/80 backdrop-blur-sm border border-white/50">
            <CardBody className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{errorInfo.title}</h1>
              <p className="text-gray-600 mb-6">{errorInfo.message}</p>
              <Link
                to="/login"
                className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Go to Login
              </Link>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-md w-full px-4 py-12"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
          <p className="mt-2 text-gray-600">You&apos;ve been invited to join!</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, filter: 'blur(20px)', scale: 0.95 }}
          animate={{
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1,
            y: [0, -4, 0],
          }}
          transition={{
            opacity: { duration: 0.6, delay: 0.3 },
            filter: { duration: 0.6, delay: 0.3 },
            scale: { duration: 0.6, delay: 0.3 },
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.5 },
          }}
          whileHover={{ y: -8, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}
        >
          <Card className="shadow-xl bg-white/80 backdrop-blur-sm border border-white/50">
            <CardBody className="p-6 sm:p-8">
              {/* Email display */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <p className="text-sm text-gray-500">You&apos;re joining as</p>
                <p className="font-medium text-gray-900">{validation.email}</p>
                <p className="text-xs text-gray-500 mt-1">Role: {validation.role}</p>
              </motion.div>

              {/* Form */}
              <motion.div
                animate={isShaking ? { x: [0, -15, 15, -12, 12, -8, 8, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                <motion.form
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.1, delayChildren: 0.6 },
                    },
                  }}
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  {/* Full Name Field */}
                  <motion.div variants={blurRevealVariants} transition={{ duration: 0.4 }}>
                    <label
                      htmlFor="fullName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Full Name
                    </label>
                    <motion.div
                      animate={{
                        boxShadow:
                          focused === 'fullName'
                            ? '0 0 0 3px rgba(59, 130, 246, 0.2)'
                            : '0 0 0 0px rgba(59, 130, 246, 0)',
                      }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg"
                    >
                      <input
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        {...register('fullName')}
                        onFocus={() => setFocused('fullName')}
                        onBlur={() => setFocused(null)}
                        className={`w-full px-3 py-2.5 border rounded-lg transition-colors focus:outline-none focus:border-primary-500 ${
                          errors.fullName ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                        }`}
                      />
                    </motion.div>
                    <AnimatePresence>
                      {errors.fullName && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {errors.fullName.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Password Field */}
                  <motion.div variants={blurRevealVariants} transition={{ duration: 0.4 }}>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Password
                    </label>
                    <motion.div
                      animate={{
                        boxShadow:
                          focused === 'password'
                            ? '0 0 0 3px rgba(59, 130, 246, 0.2)'
                            : '0 0 0 0px rgba(59, 130, 246, 0)',
                      }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg"
                    >
                      <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        {...register('password')}
                        onFocus={() => setFocused('password')}
                        onBlur={() => setFocused(null)}
                        className={`w-full px-3 py-2.5 border rounded-lg transition-colors focus:outline-none focus:border-primary-500 ${
                          errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                        }`}
                      />
                    </motion.div>
                    <AnimatePresence>
                      {errors.password && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {errors.password.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Confirm Password Field */}
                  <motion.div variants={blurRevealVariants} transition={{ duration: 0.4 }}>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Confirm Password
                    </label>
                    <motion.div
                      animate={{
                        boxShadow:
                          focused === 'confirmPassword'
                            ? '0 0 0 3px rgba(59, 130, 246, 0.2)'
                            : '0 0 0 0px rgba(59, 130, 246, 0)',
                      }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg"
                    >
                      <input
                        id="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        {...register('confirmPassword')}
                        onFocus={() => setFocused('confirmPassword')}
                        onBlur={() => setFocused(null)}
                        className={`w-full px-3 py-2.5 border rounded-lg transition-colors focus:outline-none focus:border-primary-500 ${
                          errors.confirmPassword
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 bg-white'
                        }`}
                      />
                    </motion.div>
                    <AnimatePresence>
                      {errors.confirmPassword && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {errors.confirmPassword.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* API Error */}
                  <AnimatePresence>
                    {acceptMutation.isError && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
                      >
                        {getApiError(acceptMutation.error).message}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <motion.div variants={blurRevealVariants} transition={{ duration: 0.4 }}>
                    <motion.button
                      type="submit"
                      disabled={isLoading || showSuccess}
                      whileHover={{ scale: isLoading || showSuccess ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading || showSuccess ? 1 : 0.98 }}
                      animate={{
                        backgroundColor: showSuccess ? 'rgb(34, 197, 94)' : 'rgb(59, 130, 246)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      className="w-full h-12 text-white rounded-lg font-medium relative overflow-hidden disabled:cursor-not-allowed"
                    >
                      <AnimatePresence mode="wait">
                        {!isLoading && !showSuccess && (
                          <motion.span
                            key="text"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            Create Account
                          </motion.span>
                        )}
                        {isLoading && !showSuccess && (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <LoadingDots />
                          </motion.div>
                        )}
                        {showSuccess && (
                          <motion.div
                            key="success"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <CheckIcon />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </motion.div>
                </motion.form>
              </motion.div>

              {/* Success Message */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-green-600 font-medium mt-4"
                  >
                    Welcome aboard!
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Login Link */}
              <motion.div
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ delay: 1.0, duration: 0.4 }}
                className="mt-6 text-center text-sm"
              >
                <span className="text-gray-600">Already have an account? </span>
                <Link
                  to="/login"
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </motion.div>
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Helper to get API error message
function getApiError(error: unknown): { message: string } {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return { message: response.data.message };
    }
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'An unexpected error occurred' };
}

// Loading Dots Animation
function LoadingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
          className="w-2 h-2 bg-white rounded-full"
        />
      ))}
    </div>
  );
}

// Animated Check Icon
function CheckIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
