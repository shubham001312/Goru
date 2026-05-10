import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useSearchUsers, startPrivateChat } from '../lib/hooks';
import { Header, IconButton, Avatar } from './common';
import { ChevronLeft, Search, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Contacts = ({ onBack, onChatStarted }: { onBack: () => void; onChatStarted: (id: string) => void }) => {
  const { profile } = useAuth();
  const { search, results, loading } = useSearchUsers();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    search(val);
  };

  const handleStartChat = async (targetUserId: string) => {
    if (!profile) return;
    const chatId = await startPrivateChat(profile.uid, targetUserId);
    onChatStarted(chatId);
  };

  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col z-[60]">
      <Header 
        leftAction={<IconButton icon={ChevronLeft} onClick={onBack} />}
        title="New Message" 
      />
      
      <div className="pt-16 pb-4">
        <div className="px-4 py-2 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <Search size={18} className="text-brand-text-muted" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search by username"
              className="bg-transparent flex-1 outline-none text-brand-text-primary"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-8 text-center text-brand-text-muted">Searching...</div>}
          
          <AnimatePresence>
            {!loading && results.map((user, idx) => (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleStartChat(user.uid)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-brand-surface/50 cursor-pointer border-b border-brand-border/30 last:border-0"
              >
                <Avatar name={user.displayName} src={user.photoURL} />
                <div className="flex-1">
                  <h3 className="font-medium text-white text-[15px]">{user.displayName}</h3>
                  <p className="text-xs text-brand-text-muted">@{user.username}</p>
                </div>
                <UserPlus size={18} className="text-brand-blue" />
              </motion.div>
            ))}
          </AnimatePresence>

          {!loading && searchTerm && results.length === 0 && (
            <div className="p-12 text-center text-brand-text-muted">
              No users found matching "@{searchTerm}"
            </div>
          )}

          {!searchTerm && (
            <div className="p-8 text-center space-y-2">
              <p className="text-brand-text-muted text-sm font-medium uppercase tracking-wider">Find People</p>
              <p className="text-xs text-brand-text-secondary">Type a username to find other Goru users and start chatting securely.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
