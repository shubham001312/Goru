/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './components/AuthScreen';
import { ChatList } from './components/ChatList';
import { ChatRoom } from './components/ChatRoom';
import { Settings } from './components/Settings';
import { Contacts } from './components/Contacts';
import { AdminDashboard } from './components/AdminDashboard';
import { MessageCircle, Phone, Users, Settings as SettingsIcon, ShieldAlert, Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { Notification } from './types';

type Screen = 'chats' | 'calls' | 'contacts' | 'settings' | 'chat-room' | 'admin';

function MainLayout() {
  const { user, profile, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for current user notifications or broadcasts
    const qAll = query(
      collection(db, 'notifications'), 
      where('targetUid', '==', 'all'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const qUser = query(
      collection(db, 'notifications'), 
      where('targetUid', '==', user.uid),
      where('read', '==', false),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubAll = onSnapshot(qAll, (snap) => {
      if (!snap.empty) {
        const notif = { id: snap.docs[0].id, ...snap.docs[0].data() } as Notification;
        // Only show if it's very recent or we have a mechanism to track read state for 'all'
        // For simplicity, just show the latest one if it's new in this session
        setActiveNotification(notif);
      }
    });

    const unsubUser = onSnapshot(qUser, (snap) => {
      if (!snap.empty) {
        const notif = { id: snap.docs[0].id, ...snap.docs[0].data() } as Notification;
        setActiveNotification(notif);
      }
    });

    return () => {
      unsubAll();
      unsubUser();
    };
  }, [user]);

  const closeNotification = async () => {
    if (activeNotification && activeNotification.targetUid !== 'all') {
      try {
        await updateDoc(doc(db, 'notifications', activeNotification.id), { read: true });
      } catch (err) { console.error(err); }
    }
    setActiveNotification(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-bg">
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ duration: 1, repeat: Infinity }}
          className="w-12 h-12 bg-brand-blue rounded-2xl"
        />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const navigateToChat = (id: string) => {
    setActiveChatId(id);
    setCurrentScreen('chat-room');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <AnimatePresence mode="wait">
        {currentScreen === 'chats' && (
          <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <ChatList 
              onSelectChat={navigateToChat} 
              onNewChat={() => setCurrentScreen('contacts')}
            />
          </motion.div>
        )}
        
        {currentScreen === 'contacts' && (
          <motion.div key="contacts" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="h-full">
            <Contacts 
              onBack={() => setCurrentScreen('chats')} 
              onChatStarted={navigateToChat}
            />
          </motion.div>
        )}

        {currentScreen === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <Settings />
            {profile?.isAdmin && (
              <button 
                onClick={() => setCurrentScreen('admin')}
                className="fixed bottom-24 left-6 right-6 h-14 bg-brand-blue/10 border border-brand-blue/30 rounded-2xl flex items-center justify-center gap-3 text-brand-blue font-bold shadow-lg"
              >
                <ShieldAlert size={20} />
                COMMAND CENTER
              </button>
            )}
          </motion.div>
        )}

        {currentScreen === 'admin' && profile?.isAdmin && (
          <motion.div key="admin" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="h-full">
            <AdminDashboard onBack={() => setCurrentScreen('settings')} />
          </motion.div>
        )}

        {currentScreen === 'chat-room' && activeChatId && (
          <motion.div key="chat-room" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="h-full z-[100]">
            <ChatRoom chatId={activeChatId} onBack={() => setCurrentScreen('chats')} />
          </motion.div>
        )}

        {/* Placeholder for Calls */}
        {currentScreen === 'calls' && (
          <div className="flex-1 flex flex-col items-center justify-center text-brand-text-muted p-12 text-center">
            <Phone size={64} className="mb-4 opacity-20" />
            <h2 className="text-xl font-bold text-white mb-2">Voice & Video Calls</h2>
            <p>Peer-to-peer encrypted calls coming soon to Goru.</p>
            <button onClick={() => setCurrentScreen('chats')} className="mt-6 text-brand-blue font-medium">Back to Chats</button>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      {currentScreen !== 'chat-room' && (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-brand-surface/80 backdrop-blur-lg border-t border-brand-border flex items-center justify-around px-2 pb-2 z-[50]">
          <NavItem 
            icon={MessageCircle} 
            label="Chats" 
            active={currentScreen === 'chats'} 
            onClick={() => setCurrentScreen('chats')} 
          />
          <NavItem 
            icon={Phone} 
            label="Calls" 
            active={currentScreen === 'calls'} 
            onClick={() => setCurrentScreen('calls')} 
          />
          <NavItem 
            icon={Users} 
            label="Contacts" 
            active={currentScreen === 'contacts'} 
            onClick={() => setCurrentScreen('contacts')} 
          />
          <NavItem 
            icon={SettingsIcon} 
            label="Settings" 
            active={currentScreen === 'settings'} 
            onClick={() => setCurrentScreen('settings')} 
          />
        </nav>
      )}

      {/* In-App Notification Modal */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 z-[200] bg-brand-blue rounded-2xl shadow-2xl p-4 border border-white/20"
          >
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm">{activeNotification.title}</h4>
                <p className="text-white/90 text-xs mt-1 leading-relaxed">{activeNotification.body}</p>
              </div>
              <button onClick={closeNotification} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-2xl transition-all ${active ? 'text-brand-blue' : 'text-brand-text-muted hover:text-brand-text-secondary'}`}
    >
      <div className={`relative p-1.5 rounded-xl transition-colors ${active ? 'bg-brand-blue/10' : ''}`}>
        <Icon size={24} fill={active ? 'currentColor' : 'none'} className={active ? 'opacity-90' : ''} />
        {active && <motion.div layoutId="nav-dot" className="absolute -top-1 -right-1 w-2 h-2 bg-brand-blue rounded-full" />}
      </div>
      <span className="text-[10px] font-semibold tracking-wide uppercase">{label}</span>
    </button>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mb-6 text-red-500">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h1>
          <p className="text-brand-text-secondary mb-8 max-w-xs">
            Goru encountered an unexpected error. We've been notified and are working on it.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-brand-blue text-white rounded-2xl font-bold shadow-lg shadow-brand-blue/20"
          >
            Restart Goru
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ErrorBoundary>
  );
}
