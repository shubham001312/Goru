import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useSearchUsers, useFriends, addFriend, startPrivateChat } from '../lib/hooks';
import { Header, IconButton, Avatar } from './common';
import { ChevronLeft, Search, UserPlus, Check, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

export const Contacts = ({ onBack, onChatStarted }: { onBack: () => void; onChatStarted: (id: string) => void }) => {
  const { profile } = useAuth();
  const { search, results, loading } = useSearchUsers(profile?.uid);
  const { friends, loading: loadingFriends } = useFriends(profile?.uid);
  const [searchTerm, setSearchTerm] = useState('');
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Fetch profiles for friends
  useEffect(() => {
    const fetchFriends = async () => {
      if (!friends.length) {
        setFriendProfiles([]);
        return;
      }
      setLoadingProfiles(true);
      const profiles = await Promise.all(
        friends.map(async (uid) => {
          const d = await getDoc(doc(db, 'users', uid));
          return d.data() as UserProfile;
        })
      );
      setFriendProfiles(profiles.filter(p => !!p));
      setLoadingProfiles(false);
    };
    fetchFriends();
  }, [friends]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (val.length >= 2) {
      search(val);
    }
  };

  const handleStartChat = async (targetUserId: string) => {
    if (!profile) return;
    const chatId = await startPrivateChat(profile.uid, targetUserId);
    onChatStarted(chatId);
  };

  const handleAddFriend = async (e: React.MouseEvent, friendId: string) => {
    e.stopPropagation();
    if (!profile) return;
    await addFriend(profile.uid, friendId);
  };

  const isFriend = (uid: string) => friends.includes(uid);

  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col z-[60]">
      <Header 
        leftAction={<IconButton icon={ChevronLeft} onClick={onBack} />}
        title="New Message" 
      />
      
      <div className="pt-16 pb-4 flex flex-col flex-1 overflow-hidden">
        <div className="px-4 py-2 border-b border-brand-border bg-brand-bg/80 backdrop-blur-md sticky top-0 z-10">
          <div className="bg-brand-surface rounded-full flex items-center px-4 py-2.5 gap-3 border border-brand-border">
            <Search size={18} className="text-brand-text-muted" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search name or username..."
              className="bg-transparent flex-1 outline-none text-sm text-brand-text-primary"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-brand-text-muted">Searching users...</p>
            </div>
          )}
          
          <AnimatePresence mode="wait">
            {searchTerm.length >= 2 && !loading ? (
              <motion.div 
                key="search-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="px-4 py-2 bg-brand-surface/30">
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Global Search Results</p>
                </div>
                {results.map((user, idx) => (
                  <UserItem 
                    key={user.uid}
                    user={user}
                    index={idx}
                    isFriend={isFriend(user.uid)}
                    onChat={() => handleStartChat(user.uid)}
                    onAdd={(e) => handleAddFriend(e, user.uid)}
                  />
                ))}
                {results.length === 0 && (
                  <div className="p-12 text-center text-brand-text-muted space-y-2">
                    <Search size={40} className="mx-auto opacity-10" />
                    <p className="text-sm">No users found matching "{searchTerm}"</p>
                  </div>
                )}
              </motion.div>
            ) : searchTerm.length < 2 && (
              <motion.div
                key="contacts-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="px-4 py-2 bg-brand-surface/30">
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Your Friends</p>
                </div>
                
                {loadingFriends || loadingProfiles ? (
                   <div className="p-8 text-center text-brand-text-muted text-xs">Loading contacts...</div>
                ) : friendProfiles.length === 0 ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-brand-surface rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                      <UserPlus size={32} className="text-brand-blue opacity-50" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-white text-sm font-semibold tracking-tight">Expand Your Network</p>
                      <p className="text-[11px] text-brand-text-muted max-w-[220px] mx-auto leading-relaxed">
                        Search for people by name or username and add them to your contacts to chat.
                      </p>
                    </div>
                  </div>
                ) : (
                  friendProfiles.map((user, idx) => (
                    <UserItem 
                      key={user.uid}
                      user={user}
                      index={idx}
                      isFriend={true}
                      onChat={() => handleStartChat(user.uid)}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const UserItem = ({ user, index, isFriend, onChat, onAdd }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    onClick={onChat}
    className="flex items-center gap-4 px-4 py-4 hover:bg-brand-surface/50 cursor-pointer border-b border-brand-border/30 last:border-0 transition-colors group"
  >
    <Avatar name={user.displayName} src={user.photoURL} size={48} />
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-white text-[15px] truncate">{user.displayName}</h3>
      <p className="text-xs text-brand-text-muted">@{user.username}</p>
    </div>
    <div className="flex items-center gap-2">
      {isFriend ? (
        <MessageCircle size={18} className="text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity" />
      ) : (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-blue text-white text-[11px] font-bold shadow-lg shadow-brand-blue/20"
        >
          <UserPlus size={14} />
          <span>Add</span>
        </motion.button>
      )}
    </div>
  </motion.div>
);
