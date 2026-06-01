/**
 * Social Planner - Login Page
 * Complete Animation: Blur Reveal + Float + Press + Focus + Success Flow
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { useLogin } from '@/hooks/useAuth';
import { useIsAuthenticated } from '@/stores/authStore';
import { Card, CardBody } from '@/components/ui';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Public read-only demo account (seeded as demo@planner.com). The credentials are
// intentionally public — the API rejects every write from this account. They are
// overridable per-deployment, and the button can be hidden with
// VITE_DEMO_LOGIN_ENABLED=false.
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || 'demo@planner.com';
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'demo';
const DEMO_LOGIN_ENABLED = import.meta.env.VITE_DEMO_LOGIN_ENABLED !== 'false';

// OAuth URLs - these will redirect to the API
// TODO: Re-enable when OAuth is configured
// const GOOGLE_AUTH_URL = '/api/auth/google';

export function Login() {
  const isAuthenticated = useIsAuthenticated();
  const loginMutation = useLogin();
  const [searchParams] = useSearchParams();
  const [focused, setFocused] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const lastSubmitCount = useRef(0);

  // Check for OAuth error (e.g., no_invitation)
  const oauthError = searchParams.get('error');
  const oauthMessage = searchParams.get('message');

  const {
    register,
    handleSubmit,
    formState: { errors, submitCount },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });
  const hasErrors = Object.keys(errors).length > 0;

  // Trigger shake animation on each failed submit
  useEffect(() => {
    if (submitCount > lastSubmitCount.current && hasErrors) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 600);
      lastSubmitCount.current = submitCount;
      return () => clearTimeout(timer);
    }
    lastSubmitCount.current = submitCount;
  }, [submitCount, hasErrors]);

  // Show success animation when login succeeds
  useEffect(() => {
    if (loginMutation.isSuccess) {
      setShowSuccess(true);
    }
  }, [loginMutation.isSuccess]);

  // Redirect if already authenticated
  if (isAuthenticated && !showSuccess) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleDemoLogin = () => {
    loginMutation.mutate({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  };

  // Blur reveal variants for staggered children
  const blurRevealVariants = {
    hidden: { opacity: 0, filter: 'blur(8px)' },
    visible: { opacity: 1, filter: 'blur(0px)' },
  };

  const isLoading = loginMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      {/* Login Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-md w-full px-4 py-12"
      >
        {/* Header - Blur Reveal */}
        <motion.div
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-primary-600">Social Planner</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </motion.div>

        {/* Card - Blur Reveal + Float + Hover Lift */}
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
              {/* OAuth Error Banner */}
              <AnimatePresence>
                {oauthError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                      <div>
                        <h3 className="text-sm font-semibold text-amber-800">
                          {oauthError === 'no_invitation' ? 'Invitation Required' : 'Sign In Error'}
                        </h3>
                        <p className="text-sm text-amber-700 mt-1">
                          {oauthMessage ||
                            (oauthError === 'no_invitation'
                              ? 'Registration is invite-only. Please contact an administrator to request access.'
                              : 'An error occurred during sign in. Please try again.')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* TODO: Re-enable OAuth buttons when configured
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1, delayChildren: 0.6 },
                  },
                }}
                className="space-y-3 mb-6"
              >
                <motion.a
                  href={GOOGLE_AUTH_URL}
                  className="block"
                  variants={blurRevealVariants}
                  transition={{ duration: 0.4 }}
                >
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, backgroundColor: 'rgb(249, 250, 251)' }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className="w-full p-3 border border-gray-200 rounded-lg text-gray-700 font-medium bg-white flex items-center justify-center gap-3"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </motion.button>
                </motion.a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="relative my-6"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white/80 px-4 text-gray-500">or continue with email</span>
                </div>
              </motion.div>
              */}

              {/* Login Form - Shake on error */}
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
                      transition: { staggerChildren: 0.1, delayChildren: 0.9 },
                    },
                  }}
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  {/* Email Field with Focus Ring Animation */}
                  <motion.div variants={blurRevealVariants} transition={{ duration: 0.4 }}>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <motion.div
                      animate={{
                        boxShadow:
                          focused === 'email'
                            ? '0 0 0 3px rgba(59, 130, 246, 0.2)'
                            : '0 0 0 0px rgba(59, 130, 246, 0)',
                      }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg"
                    >
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        {...register('email')}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused(null)}
                        className={`w-full px-3 py-2.5 border rounded-lg transition-colors focus:outline-none focus:border-primary-500 ${
                          errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
                        }`}
                      />
                    </motion.div>
                    <AnimatePresence>
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-red-500 text-sm mt-1"
                        >
                          {errors.email.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Password Field with Focus Ring Animation */}
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
                        autoComplete="current-password"
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

                  {/* Forgot Password Link */}
                  <motion.div
                    variants={blurRevealVariants}
                    transition={{ duration: 0.4 }}
                    className="text-right"
                  >
                    <Link
                      to="/forgot-password"
                      className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      Forgot your password?
                    </Link>
                  </motion.div>

                  {/* Submit Button with Loading Dots + Success State */}
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
                            Sign in
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

              {/* Demo login — read-only exploration */}
              {DEMO_LOGIN_ENABLED && (
                <motion.div
                  initial={{ opacity: 0, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{ delay: 1.1, duration: 0.4 }}
                  className="mt-6"
                >
                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white/80 px-4 text-gray-500">or</span>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={isLoading || showSuccess}
                    whileHover={{ scale: isLoading || showSuccess ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading || showSuccess ? 1 : 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    className="w-full h-12 rounded-lg font-medium border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    👀 Explore the demo (read-only)
                  </motion.button>
                  <p className="mt-2 text-center text-xs text-gray-500">
                    Browse with sample data — no sign-up, and nothing you do is saved.
                  </p>
                </motion.div>
              )}

              {/* Success Message */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-green-600 font-medium mt-4"
                  >
                    Successfully signed in!
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Register Link - Blur Reveal */}
              <motion.div
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ delay: 1.3, duration: 0.4 }}
                className="mt-6 text-center text-sm"
              >
                <span className="text-gray-600">Don&apos;t have an account? </span>
                <Link
                  to="/register"
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Sign up
                </Link>
              </motion.div>
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
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

// TODO: Re-enable when OAuth is configured
// Google Icon Component
// function GoogleIcon() {
//   return (
//     <svg className="w-5 h-5" viewBox="0 0 24 24">
//       <path
//         fill="#4285F4"
//         d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
//       />
//       <path
//         fill="#34A853"
//         d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
//       />
//       <path
//         fill="#FBBC05"
//         d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
//       />
//       <path
//         fill="#EA4335"
//         d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
//       />
//     </svg>
//   );
// }
