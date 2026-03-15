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
      staggerChildren: 0.08,
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

const passwordStrengthLevels = [
  { level: 1, color: 'bg-red-500', label: 'Weak' },
  { level: 2, color: 'bg-orange-500', label: 'Fair' },
  { level: 3, color: 'bg-yellow-500', label: 'Good' },
  { level: 4, color: 'bg-green-500', label: 'Strong' },
];

const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
};

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const passwordStrength = calculatePasswordStrength(password);

  const validateForm = () => {
    const newErrors: any = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    const toastId = toast.loading('Creating your account...');

    try {
      const response = await authAPI.register(email, password, name);
      const { token, user } = response.data;

      // Store token in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success('Welcome to NoteMind! 🎉', { id: toastId });

      // Redirect to dashboard
      setTimeout(() => router.push('/dashboard'), 500);
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign Up - NoteMind</title>
        <meta
          name="description"
          content="Create your NoteMind account and start learning"
        />
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
              <p className="text-gray-400 text-sm">Start your learning journey</p>
            </motion.div>

            {/* Register Card */}
            <motion.div variants={itemVariants}>
              <GlassCard className="p-8 space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
                  <p className="text-gray-400 text-sm">Join thousands of learners</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Input */}
                  <motion.div whileFocus={{ scale: 1.02 }} className="group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errors.name) setErrors({ ...errors, name: '' });
                        }}
                        placeholder="John Doe"
                        className={`w-full px-4 py-3 bg-white/10 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500 ${
                          errors.name
                            ? 'border-red-500'
                            : 'border-purple-500/30 focus:border-purple-500'
                        }`}
                        disabled={loading}
                      />
                      {errors.name && (
                        <span className="absolute right-3 top-3.5 text-red-400 text-lg">
                          ⚠️
                        </span>
                      )}
                    </div>
                    {errors.name && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-xs mt-1"
                      >
                        {errors.name}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* Email Input */}
                  <motion.div whileFocus={{ scale: 1.02 }} className="group">
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
                      {errors.email && (
                        <span className="absolute right-3 top-3.5 text-red-400 text-lg">
                          ⚠️
                        </span>
                      )}
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
                  <motion.div whileFocus={{ scale: 1.02 }} className="group">
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

                    {/* Password Strength */}
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {passwordStrengthLevels.map((level) => (
                            <motion.div
                              key={level.level}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: passwordStrength >= level.level ? 1 : 0.3 }}
                              className={`h-1 flex-1 rounded-full ${
                                passwordStrength >= level.level
                                  ? level.color
                                  : 'bg-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-400">
                          Password strength:{' '}
                          <span className="font-medium text-gray-300">
                            {passwordStrengthLevels[Math.max(0, passwordStrength - 1)]?.label}
                          </span>
                        </p>
                      </div>
                    )}

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

                  {/* Confirm Password Input */}
                  <motion.div whileFocus={{ scale: 1.02 }} className="group">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword)
                            setErrors({ ...errors, confirmPassword: '' });
                        }}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 bg-white/10 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500 ${
                          errors.confirmPassword
                            ? 'border-red-500'
                            : 'border-purple-500/30 focus:border-purple-500'
                        }`}
                        disabled={loading}
                      />
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-300 text-lg"
                        disabled={loading}
                      >
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </motion.button>
                    </div>

                    {confirmPassword &&
                      password === confirmPassword &&
                      !errors.confirmPassword && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-green-400 text-xs mt-1"
                        >
                          ✓ Passwords match
                        </motion.p>
                      )}

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

                  {/* Terms & Conditions */}
                  <motion.div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeTerms}
                      onChange={(e) => {
                        setAgreeTerms(e.target.checked);
                        if (errors.terms) setErrors({ ...errors, terms: '' });
                      }}
                      className="w-4 h-4 mt-1 rounded bg-white/10 border border-purple-500/30 cursor-pointer accent-purple-500"
                      disabled={loading}
                    />
                    <label htmlFor="terms" className="text-xs text-gray-400 cursor-pointer">
                      I agree to the{' '}
                      <Link href="/terms" className="text-purple-400 hover:text-purple-300">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-purple-400 hover:text-purple-300">
                        Privacy Policy
                      </Link>
                    </label>
                  </motion.div>

                  {errors.terms && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-xs"
                    >
                      {errors.terms}
                    </motion.p>
                  )}

                  {/* Sign Up Button */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <GradientButton
                      type="submit"
                      disabled={loading}
                      loading={loading}
                      className="w-full py-3 mt-2"
                    >
                      {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
                    </GradientButton>
                  </motion.div>
                </form>

                {/* Login Link */}
                <p className="text-center text-gray-400 text-sm">
                  Already have an account?{' '}
                  <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                    Login here
                  </Link>
                </p>
              </GlassCard>
            </motion.div>

            {/* Footer Text */}
            <motion.p
              variants={itemVariants}
              className="text-center text-gray-500 text-xs mt-6"
            >
              Join our community of active learners transforming education
            </motion.p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
