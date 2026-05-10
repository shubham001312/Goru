export type UserProfile = {
  uid: string;
  displayName: string;
  username: string;
  photoURL?: string;
  wallpaperURL?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: any;
  location?: {
    lat: number;
    lng: number;
    city?: string;
  };
  isAdmin?: boolean;
  createdAt: string;
  lockedChatIds?: string[];
  chatLockCode?: string;
};

export type ChatType = 'private' | 'group' | 'channel';

export type Chat = {
  id: string;
  type: ChatType;
  participants: string[];
  name?: string;
  photoURL?: string;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
  };
  createdAt: any;
  adminIds?: string[];
};

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'audio';

export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  type: MessageType;
  timestamp: any;
  status: MessageStatus;
  attachmentUrl?: string;
  selfDestructAt?: any;
};

export type Notification = {
  id: string;
  targetUid: string | 'all';
  title: string;
  body: string;
  timestamp: any;
  read?: boolean;
};
