import { LucideIcon, Camera, ChevronLeft, X, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';
import { UserProfile } from '../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export const Header = ({ title, subtitle, onBack, leftAction, rightActions }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 glass border-b border-white/5 flex items-center px-4 z-50">
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        {onBack && !leftAction && (
          <IconButton 
            icon={ChevronLeft} 
            onClick={onBack} 
            className="-ml-2 text-brand-text-primary" 
          />
        )}
        {leftAction}
        <div className="flex flex-col">
          <h1 className="font-semibold text-brand-text-primary capitalize truncate text-[15px]">{title}</h1>
          {subtitle && (
            <span className="text-[10px] text-brand-text-muted truncate uppercase tracking-wider font-semibold">{subtitle}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {rightActions}
      </div>
    </header>
  );
};

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const IconButton = ({ icon: Icon, onClick, className, disabled }: IconButtonProps) => (
  <motion.button
    whileTap={disabled ? {} : { scale: 0.9 }}
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-full hover:bg-brand-surface text-brand-text-secondary disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    <Icon size={22} />
  </motion.button>
);

export const Avatar = ({ src, name, size = 40, className = '', isOnline }: { src?: string; name: string; size?: number; className?: string; isOnline?: boolean }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div 
        className={`w-full h-full bg-brand-surface rounded-full flex items-center justify-center overflow-hidden border border-brand-border ${className}`}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-medium text-brand-blue">{initials}</span>
        )}
      </div>
      {isOnline && (
        <div className="absolute bottom-0 right-0 w-[25%] h-[25%] bg-green-500 rounded-full border-2 border-brand-bg shadow-sm" />
      )}
    </div>
  );
};

interface FilePickerProps {
  label: string;
  accept?: string;
  onSelect: (file: File) => void;
  icon?: LucideIcon;
  loading?: boolean;
}

export const FilePicker = ({ label, accept = "image/*", onSelect, icon: Icon = Camera, loading }: FilePickerProps) => {
  return (
    <label className="flex items-center gap-3 px-4 py-3 bg-brand-bg hover:bg-brand-surface border border-brand-border rounded-xl cursor-pointer transition-all group active:scale-95">
      <div className="p-2 rounded-lg bg-brand-surface group-hover:bg-brand-bg text-brand-blue transition-colors">
        <Icon size={18} />
      </div>
      <span className="text-sm font-medium text-brand-text-primary flex-1">{label}</span>
      {loading && <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />}
      <input 
        type="file" 
        className="hidden" 
        accept={accept} 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }} 
        disabled={loading}
      />
    </label>
  );
};

export const ProfileModal = ({ user, onClose }: { user: UserProfile; onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-brand-bg rounded-3xl overflow-hidden border border-brand-border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-32 bg-brand-maroon overflow-hidden">
          {user.wallpaperURL && <img src={user.wallpaperURL} className="w-full h-full object-cover opacity-50" />}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 rounded-full text-white hover:bg-black/40">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 pb-8 -mt-12 text-center relative">
          <Avatar name={user.displayName} src={user.photoURL} size={96} className="mx-auto border-4 border-brand-bg shadow-xl" isOnline={user.isOnline} />
          <h2 className="text-2xl font-bold text-brand-text-primary mt-4">{user.displayName}</h2>
          <p className="text-brand-text-muted text-sm font-medium mb-6">@{user.username}</p>
          
          {user.bio && (
            <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border text-left mb-6">
              <p className="text-xs text-brand-blue font-bold uppercase tracking-widest mb-1">About</p>
              <p className="text-brand-text-secondary text-sm leading-relaxed">{user.bio}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border">
               <p className="text-[10px] text-brand-text-muted font-bold uppercase mb-1">Joined</p>
               <p className="text-xs font-semibold text-brand-text-primary">
                 {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
               </p>
             </div>
             <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border">
               <p className="text-[10px] text-brand-text-muted font-bold uppercase mb-1">Status</p>
               <p className="text-xs font-semibold text-brand-text-primary flex items-center justify-center gap-1.5">
                 {user.isOnline ? (
                   <>
                     <span className="w-2 h-2 bg-green-500 rounded-full" />
                     Online
                   </>
                 ) : (
                   "Offline"
                 )}
               </p>
             </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const ConfirmModal = ({ title, message, onConfirm, onCancel, danger }: { title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-xs bg-brand-bg rounded-3xl p-6 border border-brand-border shadow-2xl text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-500/10 text-red-500' : 'bg-brand-blue/10 text-brand-blue'}`}>
          <AlertCircle size={28} />
        </div>
        <h3 className="text-lg font-bold text-brand-text-primary mb-2">{title}</h3>
        <p className="text-sm text-brand-text-secondary leading-relaxed mb-6">{message}</p>
        <div className="flex flex-col gap-2">
          <button 
            onClick={onConfirm}
            className={`w-full py-3 rounded-2xl font-bold text-sm transition-transform active:scale-95 ${danger ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'}`}
          >
            Confirm
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-3 rounded-2xl font-bold text-sm text-brand-text-muted hover:bg-brand-surface transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
