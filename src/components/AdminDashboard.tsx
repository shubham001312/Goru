import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Header, IconButton, Avatar } from './common';
import { ChevronLeft, MapPin, Globe, ShieldCheck, User, Bell, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminDashboard = ({ onBack }: { onBack: () => void }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotify, setShowNotify] = useState<string | null>(null); // 'all' or uid
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const userData = snap.docs.map(doc => doc.data() as UserProfile);
      setUsers(userData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const sendNotification = async () => {
    if (!notifyTitle || !notifyBody || !showNotify) return;
    setSending(true);
    const path = 'notifications';
    try {
      await addDoc(collection(db, 'notifications'), {
        targetUid: showNotify,
        title: notifyTitle,
        body: notifyBody,
        timestamp: serverTimestamp(),
        read: false
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowNotify(null);
        setNotifyTitle('');
        setNotifyBody('');
      }, 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col z-[70]">
      <Header 
        leftAction={<IconButton icon={ChevronLeft} onClick={onBack} />}
        title="Command Center" 
        subtitle="Developer & Founder Panel"
      />

      <div className="flex-1 overflow-y-auto pt-16 pb-6 px-4">
        <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-2xl p-6 mb-8 text-center">
          <div className="w-16 h-16 bg-brand-blue rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-blue/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Shubham Mallick</h2>
          <p className="text-brand-blue text-sm font-medium uppercase tracking-widest">Developer & Founder</p>
          
          <button 
            onClick={() => setShowNotify('all')}
            className="mt-6 w-full py-3 bg-brand-blue rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Bell size={18} />
            BROADCAST TO EVERYONE
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-brand-text-muted font-bold text-xs uppercase tracking-widest ml-1 flex items-center gap-2">
            <Globe size={14} /> Registered Users ({users.length})
          </h3>
          
          {loading ? (
            <div className="p-8 text-center text-brand-text-muted">Loading user database...</div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.uid} className="bg-brand-surface rounded-2xl border border-brand-border p-4">
                  <div className="flex items-center gap-4">
                    <Avatar name={user.displayName} src={user.photoURL} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white truncate">{user.displayName}</h4>
                        {user.isAdmin && <span className="bg-brand-blue/20 text-brand-blue text-[10px] px-2 py-0.5 rounded-full font-bold">FOUNDER</span>}
                        <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-brand-green animate-pulse' : 'bg-brand-text-muted'}`} />
                      </div>
                      <p className="text-xs text-brand-text-secondary">@{user.username}</p>
                    </div>
                    <button 
                      onClick={() => setShowNotify(user.uid)}
                      className="p-3 bg-brand-surface border border-brand-border rounded-xl text-brand-blue"
                    >
                      <Bell size={18} />
                    </button>
                  </div>
                  
                  {user.location && (
                    <div className="mt-4 pt-4 border-t border-brand-border flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-bg rounded-lg flex items-center justify-center text-brand-blue">
                        <MapPin size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-brand-text-muted uppercase font-bold tracking-wider">Location</p>
                        <p className="text-xs text-brand-text-primary">
                          {user.location.lat.toFixed(4)}, {user.location.lng.toFixed(4)}
                        </p>
                        <a 
                          href={`https://www.google.com/maps?q=${user.location.lat},${user.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-brand-blue font-bold hover:underline"
                        >
                          OPEN IN MAPS
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-[10px] text-brand-text-muted">
                    <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                    <span>UID: {user.uid.slice(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showNotify && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-[80] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-2xl"
            >
              {success ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-16 h-16 bg-brand-green/20 text-brand-green rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Sent Successfully</h3>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">
                      {showNotify === 'all' ? 'Broadcast Message' : 'Send to User'}
                    </h3>
                    <button onClick={() => setShowNotify(null)} className="text-brand-text-muted hover:text-white">
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-brand-text-muted uppercase">Title</label>
                       <input 
                         placeholder="Emergency Alert"
                         className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-white outline-none focus:border-brand-blue"
                         value={notifyTitle}
                         onChange={(e) => setNotifyTitle(e.target.value)}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-brand-text-muted uppercase">Message Body</label>
                       <textarea 
                         rows={4}
                         placeholder="Hello Goru users..."
                         className="w-full bg-brand-bg border border-brand-border rounded-xl p-3 text-white outline-none focus:border-brand-blue resize-none"
                         value={notifyBody}
                         onChange={(e) => setNotifyBody(e.target.value)}
                       />
                    </div>

                    <button
                      onClick={sendNotification}
                      disabled={sending || !notifyTitle || !notifyBody}
                      className="w-full h-14 bg-brand-blue text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Send size={20} />
                      {sending ? 'Sending...' : 'Send Now'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
