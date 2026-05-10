import { useAuth } from '../lib/auth';
import { Header, IconButton, Avatar } from './common';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Bell, 
  Database, 
  Lock, 
  Moon, 
  LogOut,
  Camera
} from 'lucide-react';
import { motion } from 'motion/react';

export const Settings = () => {
  const { profile, logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-brand-bg pt-16 pb-20 overflow-y-auto">
      <Header title="Settings" />

      <div className="flex flex-col items-center py-8">
        <div className="relative group">
          <Avatar name={profile?.displayName || ''} src={profile?.photoURL} size={100} />
          <button className="absolute bottom-0 right-0 p-2 bg-brand-blue rounded-full text-white shadow-lg border-2 border-brand-bg hover:scale-110 transition-transform">
            <Camera size={18} />
          </button>
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">{profile?.displayName}</h2>
        <p className="text-brand-blue font-medium">@{profile?.username}</p>
        <p className="mt-1 text-sm text-brand-text-muted">{profile?.bio || 'No bio yet'}</p>
      </div>

      <div className="px-4 space-y-6">
        <section>
          <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-3 ml-2">Account</h3>
          <div className="bg-brand-surface rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden">
            <SettingsItem icon={User} label="Edit Profile" />
            <SettingsItem icon={Shield} label="Privacy and Security" />
            <SettingsItem icon={Bell} label="Notifications" />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-3 ml-2">App Settings</h3>
          <div className="bg-brand-surface rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden">
            <SettingsItem icon={Database} label="Data and Storage" />
            <SettingsItem icon={Lock} label="App Lock" />
            <SettingsItem icon={Moon} label="Appearance" />
          </div>
        </section>

        <section className="pb-8">
          <button 
            onClick={logout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors mb-4"
          >
            <LogOut size={20} />
            Log Out
          </button>
          <p className="text-center text-[10px] text-brand-text-muted">
            Goru for Android v1.0.0 (Beta)<br/>
            Private. Secure. Always Free.
          </p>
        </section>
      </div>
    </div>
  );
};

const SettingsItem = ({ icon: Icon, label, color = "text-brand-text-secondary" }: any) => (
  <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-brand-card/50 transition-colors group">
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-xl bg-brand-bg group-hover:bg-brand-surface transition-colors ${color}`}>
        <Icon size={20} />
      </div>
      <span className="text-[15px] font-medium text-white">{label}</span>
    </div>
    <div className="w-1.5 h-1.5 border-t-2 border-r-2 border-brand-text-muted rotate-45 mr-1" />
  </button>
);
