import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export const Header = ({ title, subtitle, leftAction, rightActions }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-brand-bg border-b border-brand-border flex items-center px-4 z-50">
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        {leftAction}
        <div className="flex flex-col">
          <h1 className="font-semibold text-brand-text-primary capitalize truncate">{title}</h1>
          {subtitle && (
            <span className="text-xs text-brand-text-muted truncate">{subtitle}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {rightActions}
      </div>
    </header>
  );
};

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export const IconButton = ({ icon: Icon, onClick, className }: IconButtonProps) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className={`p-2 rounded-full hover:bg-brand-surface text-brand-text-secondary ${className}`}
  >
    <Icon size={22} />
  </motion.button>
);

export const Avatar = ({ src, name, size = 40 }: { src?: string; name: string; size?: number }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div 
      className="relative flex-shrink-0 bg-brand-surface rounded-full flex items-center justify-center overflow-hidden border border-brand-border"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm font-medium text-brand-blue">{initials}</span>
      )}
    </div>
  );
};
