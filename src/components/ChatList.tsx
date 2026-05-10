import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useChats } from '../lib/hooks';
import { Header, IconButton, Avatar } from './common';
import { Search, Plus, MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface ChatListProps {
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export const ChatList = ({ onSelectChat, onNewChat }: ChatListProps) => {
  const { profile } = useAuth();
  const { chats, loading } = useChats(profile?.uid);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const name = chat.name || 'Private Chat';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-brand-bg pt-16 pb-20">
      <Header 
        title="Goru" 
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
            placeholder="Search chats"
            className="bg-transparent flex-1 outline-none text-sm text-brand-text-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-brand-text-muted text-sm">
            Loading conversations...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-brand-text-muted p-8 text-center space-y-4">
            <MessageSquarePlus size={48} className="opacity-20" />
            <p>No conversations yet. Start messaging friends privately!</p>
            <button 
              onClick={onNewChat}
              className="bg-brand-blue text-white px-6 py-2 rounded-full font-medium text-sm"
            >
              Start New Chat
            </button>
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
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNewChat}
        className="fixed bottom-24 right-6 w-14 h-14 bg-brand-blue rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-blue/30 z-40"
      >
        <Plus size={28} />
      </motion.button>
    </div>
  );
};

const ChatItem = ({ chat, onClick, currentUserId, index }: any) => {
  const lastMsg = chat.lastMessage;
  const time = lastMsg?.timestamp?.toDate ? formatDistanceToNow(lastMsg.timestamp.toDate(), { addSuffix: true }) : '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 hover:bg-brand-surface/50 cursor-pointer transition-colors border-b border-brand-border/30 last:border-0"
    >
      <Avatar name={chat.name || 'Chat'} src={chat.photoURL} size={52} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold text-white text-[15px] truncate">
            {chat.name || 'Private Conversation'}
          </h3>
          <span className="text-[11px] text-brand-text-muted whitespace-nowrap">
            {time}
          </span>
        </div>
        <p className="text-sm text-brand-text-secondary truncate">
          {lastMsg?.senderId === currentUserId && <span className="text-brand-blue font-medium mr-1">You:</span>}
          {lastMsg?.text || 'No messages yet'}
        </p>
      </div>
    </motion.div>
  );
};
