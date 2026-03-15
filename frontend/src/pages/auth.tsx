'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { authAPI } from '@/utils/api';
import GradientButton from '@/components/GradientButton';
import ParticleBackground from '@/components/ParticleBackground';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Validation errors
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = { name: '', email: '', password: '', confirmPassword: '' };
    let isValid = true;

    if (mode === 'register') {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required';
        isValid = false;
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (mode === 'register') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
        isValid = false;
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords don't match";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors above');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const response = await authAPI.register(
          formData.email,
          formData.password,
          formData.name
        );
        localStorage.setItem('token', response.data.token);
        toast.success('Account created successfully!');
        router.push('/dashboard');
      } else {
        const response = await authAPI.login(formData.email, formData.password);
        localStorage.setItem('token', response.data.token);
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('email', formData.email);
        }
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      const message = error.response?.data?.message || 'Authentication failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setErrors({ name: '', email: '', password: '', confirmPassword: '' });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <>
      <Head>
        <title>{mode === 'login' ? 'Login' : 'Create Account'} – NoteMind</title>
      </Head>

      <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <ParticleBackground />

        {/* Backdrop glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Main Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-md relative z-10"
        >
          {/* Card */}
          <div className="relative rounded-3xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] p-8 shadow-2xl">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />

            <div className="relative z-10">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-8 text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/[0.1] mb-4">
                  <span className="text-2xl">🧠</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {mode === 'login' ? 'Welcome Back' : 'Join NoteMind'}
                </h1>
                <p className="text-white/50 text-sm">
                  {mode === 'login'
                    ? 'Sign in to continue learning'
                    : 'Start your learning journey today'}
                </p>
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {/* Name Field - Register Only */}
                  {mode === 'register' && (
                    <motion.div
                      key="name-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className={`w-full px-4 py-3 rounded-lg bg-white/[0.05] border transition-all duration-300 text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.08] focus:border-purple-500/50 ${
                          errors.name ? 'border-red-500/50' : 'border-white/[0.08]'
                        }`}
                      />
                      {errors.name && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-400 text-xs mt-1 font-inter"
                        >
                          {errors.name}
                        </motion.p>
                      )}
                    </motion.div>
                  )}

                  {/* Email Field */}
                  <motion.div key="email-field">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      className={`w-full px-4 py-3 rounded-lg bg-white/[0.05] border transition-all duration-300 text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.08] focus:border-purple-500/50 ${
                        errors.email ? 'border-red-500/50' : 'border-white/[0.08]'
                      }`}
                    />
                    {errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-xs mt-1"
                      >
                        {errors.email}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Password Field */}
                  <motion.div key="password-field">
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 rounded-lg bg-white/[0.05] border transition-all duration-300 text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.08] focus:border-purple-500/50 pr-12 ${
                          errors.password ? 'border-red-500/50' : 'border-white/[0.08]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-xs mt-1"
                      >
                        {errors.password}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Confirm Password - Register Only */}
                  {mode === 'register' && (
                    <motion.div
                      key="confirm-password-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder="••••••••"
                          className={`w-full px-4 py-3 rounded-lg bg-white/[0.05] border transition-all duration-300 text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.08] focus:border-purple-500/50 pr-12 ${
                            errors.confirmPassword ? 'border-red-500/50' : 'border-white/[0.08]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                        >
                          {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-400 text-xs mt-1"
                        >
                          {errors.confirmPassword}
                        </motion.p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Remember Me - Login Only */}
                <AnimatePresence>
                  {mode === 'login' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between pt-2"
                    >
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded bg-white/[0.05] border border-white/[0.1] cursor-pointer accent-purple-500 transition-colors group-hover:border-white/[0.2]"
                        />
                        <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                          Remember me
                        </span>
                      </label>
                      <Link
                        href="#"
                        className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="pt-4"
                >
                  <GradientButton
                    type="submit"
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Processing...
                      </span>
                    ) : mode === 'login' ? (
                      'Sign In'
                    ) : (
                      'Create Account'
                    )}
                  </GradientButton>
                </motion.div>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.1]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white/[0.03] text-white/40">or continue with</span>
                </div>
              </div>

              {/* Social Login */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: '🔵', label: 'Google' },
                  { icon: '⚫', label: 'GitHub' },
                  { icon: '🔷', label: 'Microsoft' },
                ].map((social) => (
                  <motion.button
                    key={social.label}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 text-white/60 hover:text-white/80"
                    disabled={loading}
                  >
                    <span className="text-lg">{social.icon}</span>
                  </motion.button>
                ))}
              </div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center pt-4 border-t border-white/[0.08]"
              >
                <p className="text-sm text-white/50 mb-1">
                  {mode === 'login'
                    ? "Don't have an account? "
                    : 'Already have an account? '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </motion.div>

              {/* Privacy Links */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs text-white/30 text-center mt-4"
              >
                By continuing, you agree to our{' '}
                <Link href="#" className="text-white/50 hover:text-white/70 transition-colors">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-white/50 hover:text-white/70 transition-colors">
                  Privacy
                </Link>
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
