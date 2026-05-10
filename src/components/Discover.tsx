import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useSearchUsers, startPrivateChat, createGroup } from '../lib/hooks';
import { Header, IconButton, Avatar } from './common';
import { Search, X, Users, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { useNotification } from '../lib/notifications';

interface DiscoverProps {
  onBack: () => void;
  onChatStarted: (chatId: string) => void;
}

export const Discover = ({ onBack, onChatStarted }: DiscoverProps) => {
  const { profile } = useAuth();
  const { showNotification } = useNotification();
  const { search, results, loading } = useSearchUsers(profile?.uid);
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<'search' | 'group'>('search');
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    search(val);
  };

  const handleStartPrivateChat = async (user: UserProfile) => {
    if (!profile) return;
    setCreating(true);
    try {
      const chatId = await startPrivateChat(profile.uid, user.uid);
      onChatStarted(chatId);
    } catch (err) {
      console.error(err);
      showNotification("Failed to start chat", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!profile || !groupName.trim() || selectedUsers.length === 0) return;
    setCreating(true);
    try {
      const participantIds = selectedUsers.map(u => u.uid);
      const chatId = await createGroup(groupName, participantIds, profile.uid);
      showNotification("Group created!", "success");
      onChatStarted(chatId);
    } catch (err) {
      console.error(err);
      showNotification("Failed to create group", "error");
    } finally {
      setCreating(false);
    }
  };

  const toggleUserSelection = (user: UserProfile) => {
    if (selectedUsers.find(u => u.uid === user.uid)) {
      setSelectedUsers(selectedUsers.filter(u => u.uid !== user.uid));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg pt-16">
      <Header 
        title={mode === 'search' ? "New Chat" : "New Group"} 
        onBack={onBack}
        rightActions={
          mode === 'search' ? (
            <IconButton icon={Users} onClick={() => setMode('group')} />
          ) : (
            <IconButton icon={X} onClick={() => setMode('search')} />
          )
        }
      />

      <div className="px-4 py-3 space-y-4">
        {mode === 'group' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border space-y-3">
              <input 
                type="text" 
                placeholder="Group Name"
                className="bg-transparent w-full outline-none text-brand-text-primary font-bold text-lg"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <p className="text-[10px] text-brand-text-muted uppercase font-bold tracking-widest">
                {selectedUsers.length} Participants Selected
              </p>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedUsers.map(u => (
                    <div key={u.uid} className="flex items-center gap-1.5 bg-brand-bg px-2.5 py-1 rounded-full border border-brand-border animate-in zoom-in-95">
                      <Avatar name={u.displayName} src={u.photoURL} size={20} />
                      <span className="text-[11px] text-brand-text-primary font-medium">{u.username}</span>
                      <button onClick={() => toggleUserSelection(u)}>
                        <X size={12} className="text-brand-text-muted" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedUsers.length > 0 && groupName.trim() && (
              <button 
                onClick={handleCreateGroup}
                disabled={creating}
                className="w-full bg-brand-maroon text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-maroon/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                {creating ? <Loader2 size={20} className="animate-spin" /> : <Users size={20} />}
                Create Group
              </button>
            )}
          </motion.div>
        )}

        <div className="bg-brand-surface rounded-xl flex items-center px-4 py-2.5 gap-3 border border-brand-border">
          <Search size={18} className="text-brand-text-muted" />
          <input 
            type="text" 
            placeholder={mode === 'search' ? "Search by username..." : "Add participants..."}
            className="bg-transparent flex-1 outline-none text-sm text-brand-text-primary"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        <div className="space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-brand-text-muted">
              <Loader2 size={32} className="animate-spin opacity-20" />
            </div>
          ) : results.length === 0 ? (
            searchTerm.length >= 2 ? (
              <div className="text-center py-20 text-brand-text-muted">
                <p>No users found matching "{searchTerm}"</p>
              </div>
            ) : (
              <div className="py-20 text-center space-y-4 text-brand-text-muted opacity-50 px-10">
                <UserPlus size={48} className="mx-auto" />
                <p className="text-sm">Search for friends by their username to start a conversation</p>
              </div>
            )
          ) : (
            results.map((user) => (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => mode === 'search' ? handleStartPrivateChat(user) : toggleUserSelection(user)}
                className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${
                  selectedUsers.find(u => u.uid === user.uid) 
                    ? 'bg-brand-maroon/10 border border-brand-maroon/20' 
                    : 'hover:bg-brand-surface/50 border border-transparent'
                }`}
              >
                <Avatar name={user.displayName} src={user.photoURL} size={48} isOnline={user.isOnline} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-brand-text-primary truncate">{user.displayName}</h4>
                  <p className="text-xs text-brand-text-muted truncate">@{user.username}</p>
                </div>
                {mode === 'search' ? (
                  <ArrowRight size={18} className="text-brand-text-muted" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedUsers.find(u => u.uid === user.uid) 
                      ? 'bg-brand-maroon border-brand-maroon text-white' 
                      : 'border-brand-border'
                  }`}>
                    {selectedUsers.find(u => u.uid === user.uid) && <Users size={12} />}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
