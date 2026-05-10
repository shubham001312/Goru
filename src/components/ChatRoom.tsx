import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useMessages } from '../lib/hooks';
import { Header, IconButton, Avatar } from './common';
import { ChevronLeft, Send, Paperclip, Smile, Mic, MoreVertical, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface ChatRoomProps {
  chatId: string;
  onBack: () => void;
}

export const ChatRoom = ({ chatId, onBack }: ChatRoomProps) => {
  const { profile } = useAuth();
  const { messages, loading, sendMessage } = useMessages(chatId);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !profile) return;
    await sendMessage(profile.uid, inputText);
    setInputText('');
  };

  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col z-[60]">
      <Header 
        leftAction={<IconButton icon={ChevronLeft} onClick={onBack} />}
        title="Aryan" 
        subtitle="last seen recently"
        rightActions={
          <>
            <IconButton icon={MoreVertical} />
          </>
        }
      />

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 pt-20 pb-24"
        style={{ backgroundImage: 'radial-gradient(circle, #141920 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        <div className="flex justify-center mb-6">
          <div className="bg-brand-surface/80 px-4 py-1.5 rounded-full border border-brand-border/50 text-[11px] text-brand-text-muted flex items-center gap-2">
            <Shield size={12} className="text-brand-blue" />
            Messages are end-to-end encrypted
          </div>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isOwn={msg.senderId === profile?.uid}
              showAvatar={idx === 0 || messages[idx-1]?.senderId !== msg.senderId}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-brand-bg border-t border-brand-border/30">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 bg-brand-surface rounded-2xl border border-brand-border flex items-end p-2 px-3 gap-2">
            <IconButton icon={Smile} className="p-1 hover:bg-transparent" />
            <textarea
              rows={1}
              placeholder="Message"
              className="flex-1 bg-transparent py-2 resize-none outline-none text-brand-text-primary text-[15px] max-h-32"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <IconButton icon={Paperclip} className="p-1 hover:bg-transparent" />
          </div>
          
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={inputText.trim() ? handleSend : () => {}}
            className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-brand-blue/20"
          >
            {inputText.trim() ? <Send size={20} /> : <Mic size={20} />}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

const MessageBubble = ({ msg, isOwn, showAvatar }: any) => {
  const timestamp = msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}
    >
      {!isOwn && (
        <div className="w-8 h-8 opacity-0">
          {showAvatar && <Avatar name="Sender" size={32} />}
        </div>
      )}
      <div 
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
          isOwn 
            ? 'bg-brand-sent text-white rounded-br-none' 
            : 'bg-brand-received text-brand-text-primary rounded-bl-none border border-brand-border/30'
        }`}
      >
        <p className="text-[15px] leading-relaxed break-words">{msg.text}</p>
        <div className={`flex justify-end items-center gap-1 mt-1 ${isOwn ? 'text-blue-200' : 'text-brand-text-muted'}`}>
          <span className="text-[10px]">{timestamp}</span>
          {isOwn && (
             <div className="flex">
               <span className="text-[10px]">✓</span>
               <span className="text-[10px] -ml-1">✓</span>
             </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
