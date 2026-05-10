import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, AlertCircle, CheckCircle2, X } from 'lucide-react';

type NotificationType = 'info' | 'error' | 'success';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
  hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto hide after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-6 pointer-events-none">
        <div className="flex flex-col-reverse gap-3">
          <AnimatePresence>
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border ${
                  n.type === 'error' ? 'bg-red-500 border-red-400 text-white' :
                  n.type === 'success' ? 'bg-green-600 border-green-500 text-white' :
                  'bg-brand-surface border-brand-border text-brand-text-primary'
                }`}
              >
                {n.type === 'error' && <AlertCircle size={20} />}
                {n.type === 'success' && <CheckCircle2 size={20} />}
                {n.type === 'info' && <Info size={20} className="text-brand-blue" />}
                
                <p className="text-sm font-medium flex-1">{n.message}</p>
                
                <button onClick={() => hideNotification(n.id)} className="opacity-60 hover:opacity-100 transition-opacity">
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
