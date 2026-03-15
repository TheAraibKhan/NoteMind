'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import Head from 'next/head';
import ParticleBackground from '@/components/ParticleBackground';
import CursorGlow from '@/components/CursorGlow';
import GlassCard from '@/components/GlassCard';
import GradientButton from '@/components/GradientButton';
import { authAPI } from '@/utils/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const socialButtons = [
  { icon: '🔵', label: 'Google', color: 'from-blue-500/20' },
  { icon: '◼️', label: 'GitHub', color: 'from-gray-700/20' },
  { icon: '📘', label: 'Facebook', color: 'from-blue-600/20' },
];

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    const toastId = toast.loading('Logging in...');

    try {
      const response = await authAPI.login(email, password);
      const { token, user } = response.data;

      // Store token in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success('Welcome back! 🎉', { id: toastId });

      // Redirect to dashboard
      setTimeout(() => router.push('/dashboard'), 500);
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast('Coming soon! 🚀', {
      icon: '⏳',
    });
  };

  return (
    <>
      <Head>
        <title>Login - NoteMind</title>
        <meta name="description" content="Login to NoteMind - AI-Powered Learning Platform" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 overflow-hidden relative">
        <ParticleBackground />
        <CursorGlow />

        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-md"
          >
            {/* Logo/Title */}
            <motion.div variants={itemVariants} className="text-center mb-8">
              <div className="inline-block">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="text-5xl mb-4"
                >
                  🧠
                </motion.div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                NoteMind
              </h1>
              <p className="text-gray-400 text-sm">Transform learning, master anything</p>
            </motion.div>

            {/* Login Card */}
            <motion.div variants={itemVariants}>
              <GlassCard className="p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                  <p className="text-gray-400 text-sm">
                    Continue your learning journey
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <motion.div
                    whileFocus={{ scale: 1.02 }}
                    className="group"
                  >
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: '' });
                        }}
                        placeholder="your@email.com"
                        className={`w-full px-4 py-3 bg-white/10 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500 ${
                          errors.email
                            ? 'border-red-500'
                            : 'border-purple-500/30 focus:border-purple-500'
                        }`}
                        disabled={loading}
                      />
                      <motion.div
                        animate={{ opacity: errors.email ? 1 : 0 }}
                        className="absolute right-3 top-3.5"
                      >
                        {errors.email && <span className="text-red-400 text-lg">⚠️</span>}
                      </motion.div>
                    </div>
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

                  {/* Password Input */}
                  <motion.div
                    whileFocus={{ scale: 1.02 }}
                    className="group"
                  >
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors({ ...errors, password: '' });
                        }}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 bg-white/10 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500 ${
                          errors.password
                            ? 'border-red-500'
                            : 'border-purple-500/30 focus:border-purple-500'
                        }`}
                        disabled={loading}
                      />
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-300 text-lg"
                        disabled={loading}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </motion.button>
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

                  {/* Remember & Forgot */}
                  <div className="flex justify-between items-center text-sm">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded bg-white/10 border border-purple-500/30 cursor-pointer accent-purple-500"
                        disabled={loading}
                      />
                      <span className="text-gray-400 group-hover:text-gray-300 transition-colors">
                        Remember me
                      </span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Login Button */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <GradientButton
                      type="submit"
                      disabled={loading}
                      loading={loading}
                      className="w-full py-3 mt-2"
                    >
                      {loading ? 'Logging in...' : 'LOGIN'}
                    </GradientButton>
                  </motion.div>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white/5 text-gray-400">Or continue with</span>
                  </div>
                </div>

                {/* Social Login */}
                <div className="grid grid-cols-3 gap-3">
                  {socialButtons.map((btn, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSocialLogin(btn.label)}
                      className={`p-3 rounded-lg bg-gradient-to-br ${btn.color} to-transparent border border-white/10 hover:border-white/20 transition-all group flex items-center justify-center`}
                      disabled={loading}
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">
                        {btn.icon}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* signup Link */}
                <p className="text-center text-gray-400 text-sm">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                    Sign up here
                  </Link>
                </p>
              </GlassCard>
            </motion.div>

            {/* Footer Text */}
            <motion.p
              variants={itemVariants}
              className="text-center text-gray-500 text-xs mt-6"
            >
              By logging in, you agree to our{' '}
              <Link href="/terms" className="text-purple-400 hover:text-purple-300">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-purple-400 hover:text-purple-300">
                Privacy Policy
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
