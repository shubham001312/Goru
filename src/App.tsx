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
import { usePresence } from './lib/hooks';
import { AuthScreen } from './components/AuthScreen';
import { ChatList } from './components/ChatList';
import { ChatRoom } from './components/ChatRoom';
import { Settings } from './components/Settings';
import { Discover } from './components/Discover';
import { AdminDashboard } from './components/AdminDashboard';
import { MessageCircle, Phone, Settings as SettingsIcon, ShieldAlert, Bell, X, Shield, Plus } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { db, messaging } from './lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { Notification as AppNotification } from './types';
import { Avatar } from './components/common';
import { NotificationProvider, useNotification } from './lib/notifications';

type Screen = 'chats' | 'calls' | 'settings' | 'chat-room' | 'admin' | 'discover';

function MainLayout() {
  const { user, profile, loading } = useAuth();
  const { showNotification } = useNotification();
  usePresence(user?.uid);
  const [currentScreen, setCurrentScreen] = useState<Screen>('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<AppNotification | null>(null);

  // Apply theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.toggle('light', savedTheme === 'light');
  }, []);

  // Global error listener for Firebase Custom Errors
  useEffect(() => {
    const handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = 'reason' in event ? event.reason : event.error;
      if (error && typeof error.message === 'string') {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed && parsed.error) {
            // Handle FirestoreErrorInfo
            let userFriendlyMsg = "Something went wrong";
            if (parsed.error.includes("Missing or insufficient permissions")) {
              userFriendlyMsg = "You don't have permission to perform this action.";
            } else if (parsed.error.includes("quota exceeded")) {
              userFriendlyMsg = "Database quota exceeded. Please try again tomorrow.";
            } else if (parsed.error.includes("offline")) {
              userFriendlyMsg = "You are currently offline. Please check your connection.";
            }
            showNotification(userFriendlyMsg, 'error');
          }
        } catch (e) {
          // Not a JSON error message, ignore or handle differently if needed
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen for current user notifications or broadcasts
    const qAll = query(
      collection(db, 'notifications'), 
      where('targetUid', '==', 'all'),
      limit(5) // Get latest 5 and sort in-memory to avoid index requirement
    );
    
    const qUser = query(
      collection(db, 'notifications'), 
      where('targetUid', '==', user.uid),
      where('read', '==', false),
      limit(5)
    );

    const unsubAll = onSnapshot(qAll, (snap) => {
      if (!snap.empty) {
        const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
        notifs.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
        setActiveNotification(notifs[0]);
      }
    }, (err) => console.error("Notification global unsub error:", err));

    const unsubUser = onSnapshot(qUser, (snap) => {
      if (!snap.empty) {
        const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
        notifs.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
        setActiveNotification(notifs[0]);
      }
    }, (err) => console.error("Notification user unsub error:", err));

    return () => {
      unsubAll();
      unsubUser();
    };
  }, [user]);

  // Push Notifications Setup
  useEffect(() => {
    if (!user || !messaging) return;

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { 
            vapidKey: 'BNoX_8WIdM6b...', // Usually provided in Firebase Console
          });
          
          if (token) {
            console.log('FCM Token:', token);
            // Save token to user profile
            await updateDoc(doc(db, 'users', user.uid), {
              fcmToken: token
            });
          }
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    requestPermission();

    // Foreground message handler
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      if (payload.notification) {
        setActiveNotification({
          id: Date.now().toString(),
          title: payload.notification.title || 'New Message',
          body: payload.notification.body || '',
          targetUid: user.uid,
          read: false,
          timestamp: new Date() as any
        });
      }
    });

    return unsubscribe;
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
              onNewChat={() => setCurrentScreen('discover')}
            />
          </motion.div>
        )}

        {currentScreen === 'discover' && (
          <motion.div key="discover" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="h-full">
            <Discover 
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
        <nav className="fixed bottom-0 left-0 right-0 h-20 glass border-t border-white/5 flex items-center justify-around px-2 pb-2 z-[50]">
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
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 100) {
                closeNotification();
              }
            }}
            whileDrag={{ scale: 1.02 }}
            className="fixed top-4 left-4 right-4 z-[200] glass-maroon rounded-2xl shadow-2xl p-4 border border-brand-maroon/30 cursor-grab active:cursor-grabbing"
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
      className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-2xl transition-all ${active ? 'text-brand-maroon' : 'text-brand-text-muted hover:text-brand-text-secondary'}`}
    >
      <div className={`relative p-1.5 rounded-xl transition-colors ${active ? 'bg-brand-maroon/10' : ''}`}>
        <Icon size={22} fill={active ? 'currentColor' : 'none'} className={active ? 'opacity-90' : ''} />
        {active && <motion.div layoutId="nav-dot" className="absolute -top-1 -right-1 w-2 h-2 bg-brand-maroon rounded-full" />}
      </div>
      <span className="text-[9px] font-bold tracking-tight uppercase">{label}</span>
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
      <NotificationProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}
