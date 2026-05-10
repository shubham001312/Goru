import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, MessageCircle, Lock, Zap, User, Key, ChevronLeft } from 'lucide-react';

type AuthMode = 'splash' | 'onboarding' | 'username-signup' | 'username-login';

export const AuthScreen = () => {
  const { signIn, signUpWithUsername, signInWithUsername } = useAuth();
  const [mode, setMode] = useState<AuthMode>('splash');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleUsernameAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'username-signup') {
        if (!username || !password || !displayName) throw new Error('Please fill all fields');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await signUpWithUsername(username, password, displayName);
      } else {
        if (!username || !password) throw new Error('Please fill all fields');
        await signInWithUsername(username, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signIn();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'splash') {
    return (
      <div 
        className="fixed inset-0 bg-brand-bg flex flex-col items-center justify-center p-8 cursor-pointer"
        onClick={() => setMode('onboarding')}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="w-24 h-24 bg-brand-blue rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-brand-blue/20"
        >
          <MessageCircle size={48} className="text-white" fill="white" />
        </motion.div>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold text-white mb-2"
        >
          Goru
        </motion.h1>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-brand-text-muted text-center"
        >
          Private. Secure. Always free.
        </motion.p>
        
        <div className="mt-20">
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-brand-blue text-sm font-medium"
          >
            Tap to continue
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col p-8 overflow-y-auto">
      <AnimatePresence mode="wait">
        {mode === 'onboarding' ? (
          <motion.div 
            key="onboarding"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 flex flex-col justify-center gap-8 py-10">
              <FeatureItem 
                icon={Zap} 
                title="Fast" 
                description="Goru delivers messages faster than any other application." 
              />
              <FeatureItem 
                icon={ShieldCheck} 
                title="Free" 
                description="Goru provides free unlimited cloud storage for all your data." 
              />
              <FeatureItem 
                icon={Lock} 
                title="Secure" 
                description="Goru keeps your messages safe from hacker attacks." 
              />
            </div>

            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-14 bg-white text-[#0E1117] rounded-2xl font-semibold shadow-lg flex items-center justify-center gap-3 transition-all hover:bg-gray-100 disabled:opacity-50"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>
              
              <button
                onClick={() => setMode('username-signup')}
                className="w-full h-14 bg-brand-surface text-brand-text-primary rounded-2xl font-semibold border border-brand-border flex items-center justify-center gap-3 transition-all hover:bg-brand-card"
              >
                <User size={20} className="text-brand-blue" />
                Use Username
              </button>

              <p className="text-center text-xs text-brand-text-muted px-4">
                By signing up, you agree to our Privacy Policy and Terms of Service.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="username-auth"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col"
          >
            <button 
              onClick={() => setMode('onboarding')}
              className="flex items-center gap-2 text-brand-text-muted hover:text-white transition-colors mb-8 mt-4"
            >
              <ChevronLeft size={20} />
              Back
            </button>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                {mode === 'username-signup' ? 'Create Account' : 'Welcome Back'}
              </h1>
              <p className="text-brand-text-secondary">
                {mode === 'username-signup' 
                  ? 'Pick a unique username to get started.' 
                  : 'Enter your credentials to continue.'}
              </p>
            </div>

            <form onSubmit={handleUsernameAuth} className="space-y-4">
              {mode === 'username-signup' && (
                <AuthInput 
                  icon={User} 
                  placeholder="Display Name (e.g. John Doe)" 
                  value={displayName}
                  onChange={(e: any) => setDisplayName(e.target.value)}
                />
              )}
              
              <AuthInput 
                icon={User} 
                placeholder="Username" 
                value={username}
                onChange={(e: any) => setUsername(e.target.value)}
              />
              
              <AuthInput 
                icon={Key} 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
              />

              {error && (
                <p className="text-red-400 text-sm px-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-brand-blue text-white rounded-2xl font-bold shadow-lg shadow-brand-blue/20 transition-all hover:bg-brand-blue/90 disabled:opacity-50 flex items-center justify-center h-14"
              >
                {loading ? 'Processing...' : (mode === 'username-signup' ? 'Sign Up' : 'Log In')}
              </button>
            </form>

            <p className="mt-6 text-center text-brand-text-secondary">
              {mode === 'username-signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                onClick={() => setMode(mode === 'username-signup' ? 'username-login' : 'username-signup')}
                className="text-brand-blue font-semibold"
              >
                {mode === 'username-signup' ? 'Log In' : 'Sign Up'}
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FeatureItem = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <motion.div 
    initial={{ x: -20, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    className="flex gap-4"
  >
    <div className="w-12 h-12 bg-brand-surface rounded-2xl flex items-center justify-center flex-shrink-0 text-brand-blue">
      <Icon size={24} />
    </div>
    <div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-brand-text-secondary leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

const AuthInput = ({ icon: Icon, ...props }: any) => (
  <div className="relative group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted group-focus-within:text-brand-blue transition-colors">
      <Icon size={20} />
    </div>
    <input 
      {...props}
      className="w-full bg-brand-surface border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-brand-blue transition-all"
    />
  </div>
);
