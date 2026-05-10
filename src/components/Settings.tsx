import { useState } from 'react';
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
  Camera,
  Check,
  X,
  Image as ImageIcon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateProfile } from '../lib/hooks';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { FilePicker, ConfirmModal } from './common';
import { useNotification } from '../lib/notifications';

export const Settings = () => {
  const { profile, logout } = useAuth();
  const { showNotification } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [chatLockCode, setChatLockCode] = useState(profile?.chatLockCode || '');
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
    showNotification(`Switched to ${newTheme} mode`, 'success');
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(profile.uid, { displayName, bio, chatLockCode });
      showNotification("Profile updated successfully", 'success');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      showNotification("Failed to update profile", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleWallpaperChange = async (file: File) => {
    if (!profile) return;
    setSaving(true);
    const storageRef = ref(storage, `users/${profile.uid}/wallpaper`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const wallpaperURL = await getDownloadURL(snapshot.ref);
      await updateProfile(profile.uid, { wallpaperURL });
      showNotification("Wallpaper updated", 'success');
    } catch (err) {
      console.error(err);
      showNotification("Failed to update wallpaper", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setSaving(true);
    const storageRef = ref(storage, `users/${profile.uid}/avatar`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(snapshot.ref);
      await updateProfile(profile.uid, { photoURL });
      showNotification("Avatar updated", 'success');
    } catch (err) {
      console.error(err);
      showNotification("Failed to update avatar", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg pt-16 pb-20 overflow-y-auto">
      <Header 
        title="Settings" 
        rightActions={isEditing ? (
          <div className="flex gap-2">
            <IconButton icon={X} onClick={() => setIsEditing(false)} />
            <IconButton icon={Check} className="text-green-500" onClick={handleSave} disabled={saving} />
          </div>
        ) : null}
      />

      <div className="flex flex-col items-center py-8">
        <div className="relative group">
          <Avatar name={profile?.displayName || ''} src={profile?.photoURL} size={100} />
          <label className="absolute bottom-0 right-0 p-2 bg-brand-blue rounded-full text-white shadow-lg border-2 border-brand-bg hover:scale-110 transition-transform cursor-pointer">
            <Camera size={18} />
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={saving} />
          </label>
        </div>
        
        {isEditing ? (
          <div className="mt-4 w-full px-8 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-brand-blue font-bold uppercase ml-2">Display Name</label>
              <input 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2 text-brand-text-primary outline-none focus:border-brand-blue transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-brand-blue font-bold uppercase ml-2">Bio</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2 text-brand-text-primary outline-none focus:border-brand-blue transition-colors resize-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-brand-blue font-bold uppercase ml-2">Secret Lock Code</label>
              <input 
                value={chatLockCode}
                onChange={(e) => setChatLockCode(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2 text-brand-text-primary outline-none focus:border-brand-blue transition-colors"
                type="text"
              />
              <p className="text-[10px] text-brand-text-muted ml-2">Searching this code in chat list reveals hidden chats</p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="mt-4 text-xl font-bold text-brand-text-primary">{profile?.displayName}</h2>
            <p className="text-brand-blue font-medium">@{profile?.username}</p>
            <p className="mt-1 text-sm text-brand-text-muted px-8 text-center">{profile?.bio || 'No bio yet'}</p>
          </>
        )}
      </div>

      <div className="px-4 space-y-6">
        <section>
          <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-3 ml-2">Account</h3>
          <div className="bg-brand-surface rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden">
            <SettingsItem icon={User} label="Edit Profile" onClick={() => setIsEditing(true)} />
            <SettingsItem icon={Shield} label="Privacy and Security" />
            <SettingsItem icon={Bell} label="Notifications" />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-3 ml-2">App Settings</h3>
          <div className="bg-brand-surface rounded-2xl border border-brand-border divide-y divide-brand-border overflow-hidden p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-brand-blue font-bold uppercase ml-2">Chat Wallpaper</label>
              {profile?.wallpaperURL && (
                <div className="w-full h-24 rounded-xl overflow-hidden border border-brand-border mb-2">
                  <img src={profile.wallpaperURL} alt="Wallpaper" className="w-full h-full object-cover" />
                </div>
              )}
              <FilePicker 
                label={profile?.wallpaperURL ? "Change Wallpaper" : "Set Wallpaper"} 
                icon={ImageIcon}
                onSelect={handleWallpaperChange}
                loading={saving}
              />
            </div>
            <SettingsItem icon={theme === 'dark' ? Sun : Moon} label="Appearance" onClick={toggleTheme} color={theme === 'dark' ? "text-yellow-400" : "text-brand-purple"} />
          </div>
        </section>

        <section className="pb-8">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
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

      <AnimatePresence>
        {showLogoutConfirm && (
          <ConfirmModal 
            title="Log Out?" 
            message="Are you sure you want to log out of Goru? You will need to sign in again to access your chats." 
            danger
            onConfirm={logout}
            onCancel={() => setShowLogoutConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsItem = ({ icon: Icon, label, onClick, color = "text-brand-text-secondary" }: any) => (
  <button 
    onClick={onClick}
    className="w-full px-5 py-4 flex items-center justify-between hover:bg-brand-card/50 transition-colors group"
  >
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-xl bg-brand-bg group-hover:bg-brand-surface transition-colors ${color}`}>
        <Icon size={20} />
      </div>
      <span className="text-[15px] font-medium text-white">{label}</span>
    </div>
    <div className="w-1.5 h-1.5 border-t-2 border-r-2 border-brand-text-muted rotate-45 mr-1" />
  </button>
);
