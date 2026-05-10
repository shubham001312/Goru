import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useMessages, useTypingStatus, setTypingStatus, toggleChatLock } from '../lib/hooks';
import { Header, IconButton, Avatar, ProfileModal, ConfirmModal } from './common';
import { ChevronLeft, Send, Paperclip, Smile, Mic, MoreVertical, Shield, Square, Play, Pause, Waves, User, VolumeX, Trash2, Search, Image, X, Lock, Unlock, ArrowDown, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow } from 'date-fns';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { UserProfile, Chat } from '../types';
import EmojiPicker, { Theme, EmojiStyle, EmojiClickData, Emoji } from 'emoji-picker-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { clearChat, deleteChat, toggleChatLock } from '../lib/hooks';

interface ChatRoomProps {
  chatId: string;
  onBack: () => void;
}

export const ChatRoom = ({ chatId, onBack }: ChatRoomProps) => {
  const { profile } = useAuth();
  const { messages, loading, sendMessage, markMessagesAsRead } = useMessages(chatId);
  const typingUsers = useTypingStatus(chatId, profile?.uid);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [chatInfo, setChatInfo] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark messages as read when viewing
  useEffect(() => {
    if (profile && chatId && messages.length > 0) {
      markMessagesAsRead(profile.uid);
    }
  }, [chatId, profile, messages.length, markMessagesAsRead]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = onSnapshot(doc(db, 'chats', chatId), (d) => {
      if (d.exists()) {
        const data = d.data() as Chat;
        setChatInfo({ id: d.id, ...data });
        
        // If it's a private chat, fetch the other user's profile
        if (data.type === 'private') {
          const otherUid = data.participants.find(id => id !== profile?.uid);
          if (otherUid) {
            getDoc(doc(db, 'users', otherUid)).then(userDoc => {
              if (userDoc.exists()) setOtherUser(userDoc.data() as UserProfile);
            });
          }
        }
      }
    });
    return unsub;
  }, [chatId, profile]);

  // We also want to react to other user's presence/typing in real-time
  useEffect(() => {
    const otherUid = chatInfo?.type === 'private' 
      ? chatInfo.participants.find(id => id !== profile?.uid)
      : null;
      
    if (!otherUid) return;

    const unsub = onSnapshot(doc(db, 'users', otherUid), (d) => {
      if (d.exists()) {
        setOtherUser(d.data() as UserProfile);
      }
    });
    
    return unsub;
  }, [chatInfo, profile]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  // Typing indicator logic
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!profile) return;

    if (!isTyping) {
      setIsTyping(true);
      setTypingStatus(chatId, profile.uid, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(chatId, profile.uid, false);
    }, 3000);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !profile) return;
    
    // Clear typing status immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    setTypingStatus(chatId, profile.uid, false);

    await sendMessage(profile.uid, inputText);
    setInputText('');
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInputText(prev => prev + emojiData.emoji);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !chatId) return;

    setUploadingMedia(true);
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `chats/${chatId}/media/${fileName}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      await sendMessage(profile.uid, '', type, url);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload file.");
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/ogg';
        
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        if (chunks.length === 0) return;
        
        const audioBlob = new Blob(chunks, { type: mimeType });
        const fileName = `voice_${Date.now()}.${mimeType.split('/')[1]}`;
        const storageRef = ref(storage, `chats/${chatId}/voice/${fileName}`);
        
        try {
          const snapshot = await uploadBytes(storageRef, audioBlob);
          const url = await getDownloadURL(snapshot.ref);
          await sendMessage(profile!.uid, '', 'voice', url);
        } catch (err) {
          console.error("Voice upload error:", err);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.onstop = () => {
        // Do nothing on stop when cancelled
      };
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const filteredMessages = searchText.trim() 
    ? messages.filter(m => m.text?.toLowerCase().includes(searchText.toLowerCase()))
    : messages;

  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col z-[60]">
      <Header 
        leftAction={<IconButton icon={ChevronLeft} onClick={onBack} />}
        title={chatInfo?.type === 'group' ? (chatInfo.name || "Group") : (otherUser?.displayName || "Chat")} 
        subtitle={
          typingUsers.length > 0 ? `${typingUsers.length} typing...` : 
          chatInfo?.type === 'group' ? `${chatInfo.participants?.length || 0} participants` :
          otherUser?.isOnline ? "online" : 
          otherUser?.lastSeen ? `last seen ${formatDistanceToNow(otherUser.lastSeen.toDate ? otherUser.lastSeen.toDate() : new Date(otherUser.lastSeen), { addSuffix: true })}` : 
          "offline"
        }
        rightActions={
          <div className="flex items-center">
            <IconButton icon={Search} onClick={() => setShowSearch(!showSearch)} className={showSearch ? 'text-brand-blue' : ''} />
            <div className="relative" ref={menuRef}>
              <IconButton icon={MoreVertical} onClick={() => setShowMenu(!showMenu)} />
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute top-12 right-0 w-56 bg-brand-surface rounded-2xl shadow-2xl py-2 z-[100] overflow-hidden border border-brand-border"
                  >
                    <MenuItem icon={User} label="View Profile" onClick={() => { setShowProfile(true); setShowMenu(false); }} />
                    <MenuItem icon={Search} label="Search Messages" onClick={() => { setShowSearch(true); setShowMenu(false); }} />
                    <MenuItem 
                      icon={profile?.lockedChatIds?.includes(chatId) ? Unlock : Lock} 
                      label={profile?.lockedChatIds?.includes(chatId) ? "Unlock Chat" : "Lock Chat"} 
                      onClick={async () => {
                        if (!profile) return;
                        const currentlyLocked = profile.lockedChatIds?.includes(chatId);
                        await toggleChatLock(profile.uid, chatId, !currentlyLocked);
                        setShowMenu(false);
                      }} 
                    />
                    <MenuItem icon={VolumeX} label="Mute Notifications" onClick={() => setShowMenu(false)} />
                    <MenuItem icon={Image} label="Change Wallpaper" onClick={() => { fileInputRef.current?.click(); setShowMenu(false); }} />
                    <div className="h-px bg-brand-border my-1" />
                    <MenuItem 
                      icon={Trash2} 
                      label="Clear Chat" 
                      danger 
                      onClick={() => { setConfirmClear(true); setShowMenu(false); }} 
                    />
                    <MenuItem 
                      icon={Trash2} 
                      label="Delete Chat" 
                      danger 
                      onClick={() => { setConfirmDelete(true); setShowMenu(false); }} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        }
      />

      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-brand-surface border-b border-brand-border pt-16"
          >
            <div className="p-3 px-4 flex items-center gap-3">
              <Search size={18} className="text-brand-text-muted" />
              <input 
                autoFocus
                placeholder="Search messages..."
                className="bg-transparent flex-1 outline-none text-sm text-brand-text-primary"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <IconButton icon={X} onClick={() => { setShowSearch(false); setSearchText(''); }} className="p-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-4 space-y-4 pt-20 transition-all duration-300 ${showEmojiPicker ? 'pb-[400px]' : 'pb-24'} ${showSearch ? 'pt-24' : 'pt-20'}`}
        style={{ 
          backgroundImage: profile?.wallpaperURL 
            ? `url(${profile.wallpaperURL})` 
            : 'radial-gradient(circle, var(--brand-surface) 1px, transparent 1px)', 
          backgroundSize: profile?.wallpaperURL ? 'cover' : '24px 24px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="flex justify-center mb-6">
          <div className="bg-brand-surface/80 px-4 py-1.5 rounded-full border border-brand-border/50 text-[11px] text-brand-text-muted flex items-center gap-2 backdrop-blur-md">
            <Shield size={12} className="text-brand-blue" />
            Messages are end-to-end encrypted
          </div>
        </div>

        <AnimatePresence initial={false}>
          {filteredMessages.map((msg, idx) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isOwn={msg.senderId === profile?.uid}
              showAvatar={idx === 0 || messages[idx-1]?.senderId !== msg.senderId}
            />
          ))}
          
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start items-center gap-2 ml-1"
            >
              <div className="bg-brand-received px-4 py-2 rounded-2xl rounded-bl-none border border-brand-border/30 flex gap-1">
                <span className="w-1.5 h-1.5 bg-brand-text-muted rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-brand-text-muted rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-brand-text-muted rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showProfile && otherUser && (
          <ProfileModal user={otherUser} onClose={() => setShowProfile(false)} />
        )}
        {confirmClear && (
          <ConfirmModal 
            title="Clear Chat?" 
            message="All messages in this conversation will be permanently removed for you." 
            danger
            onConfirm={() => { clearChat(chatId); setConfirmClear(false); }}
            onCancel={() => setConfirmClear(false)}
          />
        )}
        {confirmDelete && (
          <ConfirmModal 
            title="Delete Chat?" 
            message="This conversation will be entirely removed from your chat list." 
            danger
            onConfirm={() => { deleteChat(chatId); setConfirmDelete(false); onBack(); }}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </AnimatePresence>

      <div className={`fixed bottom-0 left-0 right-0 bg-brand-bg border-t border-brand-border/30 transition-shadow ${showEmojiPicker ? 'shadow-[0_-50px_100px_-20px_rgba(0,0,0,0.5)]' : ''}`}>
        <div className="p-4">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            {isRecording ? (
               <div className="flex-1 bg-brand-maroon/10 rounded-2xl border border-brand-maroon/30 flex items-center p-3 px-4 gap-4 animate-pulse">
                  <IconButton icon={X} className="text-brand-maroon p-1 hover:bg-brand-maroon/20" onClick={cancelRecording} />
                  <div className="w-2 h-2 bg-brand-maroon rounded-full" />
                  <span className="flex-1 text-brand-maroon font-bold text-sm">Recording Voice Message...</span>
                  <span className="font-mono text-brand-maroon">{Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}</span>
               </div>
            ) : (
              <div className="flex-1 bg-brand-surface rounded-2xl border border-brand-border flex items-end p-2 px-3 gap-2">
                <IconButton 
                  icon={Smile} 
                  className={`p-1 hover:bg-transparent ${showEmojiPicker ? 'text-brand-blue' : ''}`} 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                />
                <textarea
                  rows={1}
                  placeholder="Message"
                  className="flex-1 bg-transparent py-2 resize-none outline-none text-brand-text-primary text-[15px] max-h-32"
                  value={inputText}
                  onFocus={() => setShowEmojiPicker(false)}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <IconButton 
                  icon={Paperclip} 
                  className="p-1 hover:bg-transparent" 
                  onClick={() => fileInputRef.current?.click()}
                />
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                />
              </div>
            )}
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={inputText.trim() ? handleSend : (isRecording ? stopRecording : startRecording)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg ${
                inputText.trim() ? 'bg-brand-blue shadow-brand-blue/20' : (isRecording ? 'bg-brand-maroon shadow-brand-maroon/20' : 'bg-brand-blue shadow-brand-blue/20')
              }`}
            >
              {inputText.trim() ? <Send size={20} /> : (isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />)}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 400, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-brand-bg"
            >
              <EmojiPicker
                theme={Theme.DARK}
                emojiStyle={EmojiStyle.APPLE}
                onEmojiClick={onEmojiClick}
                width="100%"
                height={400}
                lazyLoadEmojis={true}
                searchDisabled={false}
                skinTonesDisabled={true}
                previewConfig={{ showPreview: false }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, onClick, danger }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-brand-bg transition-colors ${danger ? 'text-red-500' : 'text-brand-text-primary'}`}
  >
    <Icon size={18} className={danger ? 'text-red-500' : 'text-brand-text-muted'} />
    <span className="font-medium">{label}</span>
  </button>
);

const ParsedText = ({ text }: { text: string }) => {
  // Regex to match emojis
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
  
  const parts = text.split(emojiRegex);
  
  return (
    <span className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (emojiRegex.test(part)) {
          // Get unified code from emoji character
          // This is a bit complex for multi-character emojis, so we'll try a common approach
          const unified = Array.from(part)
            .map(c => c.codePointAt(0)?.toString(16))
            .join('-');
            
          return (
            <span key={i} className="inline-block align-middle mx-0.5 transform scale-110">
              <Emoji unified={unified} size={22} emojiStyle={EmojiStyle.APPLE} />
            </span>
          );
        }
        return part;
      })}
    </span>
  );
};

const VoiceMessage = ({ url, isOwn }: { url: string; isOwn: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
      setCurrentTime(audio.currentTime);
    };
    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    audioRef.current = audio;
    return () => {
      audio.pause();
    };
  }, [url]);

  const toggle = () => {
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[240px] py-1">
      <button 
        onClick={toggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 ${isOwn ? 'bg-white/20' : 'bg-brand-maroon/10 text-brand-maroon'}`}
      >
        {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
      </button>
      
      <div className="flex-1 space-y-1">
        <div className="relative h-1.5 bg-black/20 rounded-full overflow-hidden">
          <motion.div 
            initial={false}
            animate={{ width: `${progress}%` }}
            className={`absolute top-0 left-0 h-full ${isOwn ? 'bg-white' : 'bg-brand-maroon'}`}
          />
        </div>
        <div className={`flex justify-between text-[10px] ${isOwn ? 'text-white/60' : 'text-brand-text-muted'}`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="flex items-center">
        <Avatar name="V" size={24} className="border-0 bg-transparent" />
        <Mic size={14} className={`-ml-2 ${isOwn ? 'text-white/40' : 'text-brand-text-muted'}`} />
      </div>
    </div>
  );
};

const MessageBubble = ({ msg, isOwn }: any) => {
  const timestamp = msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}
    >
      <div 
        className={`max-w-[85%] rounded-2xl shadow-sm overflow-hidden ${
          isOwn 
            ? 'bg-brand-sent text-white rounded-br-none' 
            : 'bg-brand-received text-brand-text-primary rounded-bl-none border border-brand-border/30'
        } ${msg.type === 'image' ? 'p-1' : 'px-4 py-2.5'}`}
      >
        {msg.type === 'voice' ? (
          <VoiceMessage url={msg.mediaUrl} isOwn={isOwn} />
        ) : msg.type === 'image' ? (
          <div className="flex flex-col gap-1">
            <img 
              src={msg.mediaUrl} 
              alt="Uploaded content" 
              className="max-w-full rounded-xl max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(msg.mediaUrl, '_blank')}
            />
            <div className={`flex justify-end items-center gap-1 mt-1 px-1 ${isOwn ? 'text-blue-100/70' : 'text-brand-text-muted'}`}>
              <span className="text-[10px]">{timestamp}</span>
              {isOwn && <MessageStatus status={msg.status} />}
            </div>
          </div>
        ) : (
          <>
            <ParsedText text={msg.text} />
            <div className={`flex justify-end items-center gap-1 mt-1 ${isOwn ? 'text-blue-100/70' : 'text-brand-text-muted'}`}>
              <span className="text-[10px]">{timestamp}</span>
              {isOwn && <MessageStatus status={msg.status} />}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

const MessageStatus = ({ status }: { status: string }) => (
  <div className={`flex ml-0.5 ${status === 'read' ? 'text-white' : 'text-blue-200/50'}`}>
    <span className="text-[11px] leading-none">✓</span>
    {(status === 'read' || status === 'delivered') && (
      <span className="text-[11px] leading-none -ml-1">✓</span>
    )}
  </div>
);
