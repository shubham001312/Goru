import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chat, Message, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from './error-handler';

// Hook for fetching chats
export const useChats = (userId: string | undefined) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // Remove orderBy from query to avoid composite index requirement
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Chat));
      
      // Sort in-memory
      chatData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setChats(chatData);
      setLoading(false);
    }, (error) => {
      console.error("useChats error:", error);
      handleFirestoreError(error, OperationType.LIST, 'chats');
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { chats, loading };
};

// Hook for fetching messages
export const useMessages = (chatId: string | undefined) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Message));
      setMessages(msgData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
      setLoading(false);
    });

    return unsubscribe;
  }, [chatId]);

  const sendMessage = async (senderId: string, text: string, type: string = 'text', mediaUrl?: string) => {
    if (!chatId || (!text.trim() && !mediaUrl)) return;

    const msgData = {
      chatId,
      senderId,
      text: text.trim(),
      type,
      mediaUrl,
      timestamp: serverTimestamp(),
      status: 'sent'
    };

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), msgData);
      // Update chat last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          text: text.trim(),
          senderId,
          timestamp: serverTimestamp()
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}/messages`);
    }
  };

  const markMessagesAsRead = async (userId: string) => {
    if (!chatId || !userId) return;

    try {
      // Find unread messages from the other user
      // We use 'status' in ['sent', 'delivered'] which is an equality-based check for multiple values
      const unreadQ = query(
        collection(db, 'chats', chatId, 'messages'),
        where('status', 'in', ['sent', 'delivered'])
      );
      
      const snapshot = await getDocs(unreadQ);
      const batch: Promise<void>[] = [];
      
      snapshot.docs.forEach(d => {
        const data = d.data();
        // Only mark as read if it's from the other user
        if (data.senderId !== userId) {
          batch.push(updateDoc(doc(db, 'chats', chatId, 'messages', d.id), {
            status: 'read'
          }));
        }
      });
      
      await Promise.all(batch);
    } catch (err) {
      console.error("markMessagesAsRead error:", err);
    }
  };

  return { messages, loading, sendMessage, markMessagesAsRead };
};

// Hook for typing status
export const useTypingStatus = (chatId: string | undefined, currentUserId: string | undefined) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!chatId || !currentUserId) return;

    // Listen to the typingStatus subcollection
    const q = query(collection(db, 'chats', chatId, 'typingStatus'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: string[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Only include if it's NOT the current user and isTyping is true
        // And maybe check timestamp to avoid stale status (e.g. within last 10 seconds)
        const isTyping = data.isTyping === true;
        const lastUpdate = data.timestamp?.toMillis() || 0;
        const now = Date.now();
        
        if (doc.id !== currentUserId && isTyping && (now - lastUpdate < 10000)) {
          users.push(doc.id);
        }
      });
      setTypingUsers(users);
    }, (error) => {
      console.error("useTypingStatus error:", error);
    });

    return unsubscribe;
  }, [chatId, currentUserId]);

  return typingUsers;
};

export const setTypingStatus = async (chatId: string, userId: string, isTyping: boolean) => {
  try {
    const typingRef = doc(db, 'chats', chatId, 'typingStatus', userId);
    if (isTyping) {
      await setDoc(typingRef, {
        isTyping: true,
        timestamp: serverTimestamp()
      });
    } else {
      await deleteDoc(typingRef);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}/typingStatus`);
  }
};

// Hook for searching users
export const useSearchUsers = (currentUserId?: string) => {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);

    try {
      // We search by username prefix
      const qUsername = query(
        collection(db, 'users'),
        where('username', '>=', term.toLowerCase()),
        where('username', '<=', term.toLowerCase() + '\uf8ff'),
        limit(20)
      );

      // And we search by displayName prefix
      // Note: Case sensitivity matters in Firestore prefix search. 
      // User must type with correct capitalization or we need a normalized field.
      // For now, let's do both and merge.
      const qDisplayName = query(
        collection(db, 'users'),
        where('displayName', '>=', term),
        where('displayName', '<=', term + '\uf8ff'),
        limit(20)
      );

      const [snap1, snap2] = await Promise.all([
        getDocs(qUsername),
        getDocs(qDisplayName)
      ]);

      const usersMap = new Map<string, UserProfile>();
      
      snap1.docs.forEach(d => {
        const u = d.data() as UserProfile;
        if (u.uid !== currentUserId) usersMap.set(u.uid, u);
      });

      snap2.docs.forEach(d => {
        const u = d.data() as UserProfile;
        if (u.uid !== currentUserId) usersMap.set(u.uid, u);
      });

      setResults(Array.from(usersMap.values()));
    } catch (error) {
      console.error('Search error:', error);
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  return { search, results, loading };
};

// Hook for fetching friends
export const useFriends = (userId: string | undefined) => {
  const [friends, setFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, 'users', userId, 'friends'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const friendIds = snapshot.docs.map(doc => doc.id);
      setFriends(friendIds);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}/friends`);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { friends, loading };
};

export const addFriend = async (userId: string, friendId: string) => {
  try {
    await setDoc(doc(db, 'users', userId, 'friends', friendId), {
      uid: friendId,
      addedAt: serverTimestamp()
    });
    // Add reciprocity? (Optional depending on model, let's keep it simple for now)
    await setDoc(doc(db, 'users', friendId, 'friends', userId), {
      uid: userId,
      addedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/friends`);
  }
};

export const startPrivateChat = async (currentUserId: string, targetUserId: string) => {
  try {
    console.log('Starting chat between:', currentUserId, targetUserId);
    
    // Deterministic Chat ID for 1:1 chats
    const chatId = [currentUserId, targetUserId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    
    let chatSnap;
    try {
      chatSnap = await getDoc(chatRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `chats/${chatId}`);
      throw err;
    }

    if (!chatSnap.exists()) {
      console.log('Creating new chat with ID:', chatId);
      try {
        await setDoc(chatRef, {
          id: chatId,
          type: 'private',
          participants: [currentUserId, targetUserId],
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}`);
        throw err;
      }
    }
    
    return chatId;
  } catch (err: any) {
    console.error('startPrivateChat top-level error:', err);
    throw err;
  }
};

export const createGroup = async (name: string, participantIds: string[], creatorId: string, photoURL?: string) => {
  try {
    const participants = Array.from(new Set([...participantIds, creatorId]));
    const chatData = {
      name,
      type: 'group',
      participants,
      creatorId,
      photoURL: photoURL || null,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'chats'), chatData);
    await updateDoc(docRef, { id: docRef.id });
    
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'chats');
    throw err;
  }
};

export const clearChat = async (chatId: string) => {
  try {
    const messagesQ = query(collection(db, 'chats', chatId, 'messages'));
    const snapshot = await getDocs(messagesQ);
    const batch = snapshot.docs.map(d => deleteDoc(doc(db, 'chats', chatId, 'messages', d.id)));
    await Promise.all(batch);
    
    // Update last message to reflect cleared chat
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: null
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `chats/${chatId}/messages`);
    throw err;
  }
};

export const deleteChat = async (chatId: string) => {
  try {
    await clearChat(chatId);
    await deleteDoc(doc(db, 'chats', chatId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `chats/${chatId}`);
    throw err;
  }
};

export const updateProfile = async (userId: string, data: Partial<UserProfile>) => {
  try {
    await updateDoc(doc(db, 'users', userId), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    throw err;
  }
};

export const toggleChatLock = async (userId: string, chatId: string, isLocked: boolean) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data() as UserProfile;
    let lockedChatIds = userData.lockedChatIds || [];

    if (isLocked) {
      if (!lockedChatIds.includes(chatId)) {
        lockedChatIds.push(chatId);
      }
    } else {
      lockedChatIds = lockedChatIds.filter(id => id !== chatId);
    }

    await updateDoc(userRef, { lockedChatIds });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    throw err;
  }
};

// Hook for presence tracking
export const usePresence = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, 'users', userId);

    const setOnline = async () => {
      try {
        await updateDoc(userRef, {
          isOnline: true,
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        console.error("Error setting online status:", err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      }
    };

    const setOffline = async () => {
      try {
        await updateDoc(userRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        console.error("Error setting offline status:", err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      }
    };

    // Set online when tab becomes visible, offline when hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnline();
      } else {
        setOffline();
      }
    };

    // Initial state
    if (document.visibilityState === 'visible') {
      setOnline();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat to keep online status fresh if tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setOnline();
      }
    }, 60000); // Every minute

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      setOffline();
    };
  }, [userId]);
};
