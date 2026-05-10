import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useChats } from '../lib/hooks';
import { Header, IconButton, Avatar } from './common';
import { Search, Plus, MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

interface ChatListProps {
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export const ChatList = ({ onSelectChat, onNewChat }: ChatListProps) => {
  const { profile } = useAuth();
  const { chats, loading } = useChats(profile?.uid);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocked, setShowLocked] = useState(false);

  useEffect(() => {
    if (profile?.chatLockCode && searchQuery === profile.chatLockCode) {
      setShowLocked(true);
    } else if (searchQuery === '') {
      setShowLocked(false);
    }
  }, [searchQuery, profile?.chatLockCode]);

  const filteredChats = chats.filter(chat => {
    const isLocked = profile?.lockedChatIds?.includes(chat.id);
    if (isLocked && !showLocked) return false;

    if (searchQuery && searchQuery !== profile?.chatLockCode) {
      // Basic group name search if requested
      if (chat.type === 'group' && chat.name && !chat.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-brand-bg pt-16 pb-20">
      <Header 
        title={showLocked ? "Hidden Chats" : "Goru"} 
        rightActions={
          <>
            <IconButton icon={Search} />
          </>
        }
      />
      
      <div className="px-4 py-2">
        <div className="bg-brand-surface rounded-xl flex items-center px-4 py-2.5 gap-3 border border-brand-border">
          <Search size={18} className="text-brand-text-muted" />
          <input 
            type="text" 
            placeholder={showLocked ? "Search hidden chats" : "Search chats"}
            className="bg-transparent flex-1 outline-none text-sm text-brand-text-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {showLocked && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 px-2 flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">Secret Mode Active</span>
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-brand-text-muted text-sm">
            Loading conversations...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-brand-text-muted p-8 text-center space-y-4">
            <MessageSquarePlus size={48} className="opacity-20" />
            <p>{showLocked ? "No hidden chats found." : "No conversations yet. Start messaging friends privately!"}</p>
            {!showLocked && (
              <button 
                onClick={onNewChat}
                className="bg-brand-maroon text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg shadow-brand-maroon/20 glass-maroon border border-brand-maroon/30"
              >
                Start New Chat
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filteredChats.map((chat, idx) => (
              <ChatItem 
                key={chat.id} 
                chat={chat} 
                onClick={() => onSelectChat(chat.id)}
                currentUserId={profile?.uid}
                index={idx}
                isLocked={profile?.lockedChatIds?.includes(chat.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNewChat}
        className="fixed bottom-24 right-6 w-14 h-14 bg-brand-maroon rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-maroon/30 z-40 glass-maroon border border-brand-maroon/30"
      >
        <Plus size={28} />
      </motion.button>
    </div>
  );
};

const ChatItem = ({ chat, onClick, currentUserId, index, isLocked }: any) => {
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const lastMsg = chat.lastMessage;
  const time = lastMsg?.timestamp?.toDate ? formatDistanceToNow(lastMsg.timestamp.toDate(), { addSuffix: true }) : '';

  useEffect(() => {
    // Find the ID of the other user in the participants array
    const otherUid = chat.participants?.find((id: string) => id !== currentUserId);
    if (!otherUid) return;

    if (chat.type === 'private') {
      const unsub = onSnapshot(doc(db, 'users', otherUid), (userDoc) => {
        if (userDoc.exists()) {
          setOtherUser(userDoc.data() as UserProfile);
        }
      }, (err) => {
        console.error("Error fetching other user profile:", err);
      });
      return unsub;
    }
  }, [chat.participants, chat.type, currentUserId]);

  const displayName = chat.type === 'group' ? (chat.name || 'Group Chat') : (otherUser?.displayName || otherUser?.username || 'Chat');
  const photoURL = chat.type === 'group' ? chat.photoURL : otherUser?.photoURL;
  
  const lastMsgPreview = () => {
    if (!lastMsg) return 'No messages yet';
    const sender = lastMsg.senderId === currentUserId ? 'You: ' : '';
    if (lastMsg.type === 'image') return <span>{sender}📷 Photo</span>;
    if (lastMsg.type === 'voice') return <span>{sender}🎤 Voice message</span>;
    return <span>{sender}{lastMsg.text}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 hover:bg-brand-surface/50 cursor-pointer transition-colors border-b border-brand-border/30 last:border-0 ${isLocked ? 'bg-yellow-500/5' : ''}`}
    >
      <div className="relative">
        <Avatar name={displayName} src={photoURL} size={52} isOnline={chat.type === 'private' ? otherUser?.isOnline : false} />
        {isLocked && (
          <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black p-1 rounded-full border-2 border-brand-bg shadow-sm">
            <Lock size={10} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-semibold text-brand-text-primary text-[15px] truncate">
              {displayName}
            </h3>
            {isLocked && <Lock size={12} className="text-yellow-500" />}
          </div>
          <span className="text-[11px] text-brand-text-muted whitespace-nowrap">
            {time}
          </span>
        </div>
        <p className="text-sm text-brand-text-secondary truncate">
          {lastMsgPreview()}
        </p>
      </div>
    </motion.div>
  );
};

import { Lock } from 'lucide-react';
