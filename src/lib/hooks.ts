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

  const sendMessage = async (senderId: string, text: string) => {
    if (!chatId || !text.trim()) return;

    const msgData = {
      chatId,
      senderId,
      text: text.trim(),
      type: 'text',
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

  return { messages, loading, sendMessage };
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
    
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      console.log('Creating new chat with ID:', chatId);
      await setDoc(chatRef, {
        id: chatId,
        type: 'private',
        participants: [currentUserId, targetUserId],
        createdAt: serverTimestamp(),
      });
    }
    
    return chatId;
  } catch (err: any) {
    console.error('startPrivateChat error:', err);
    handleFirestoreError(err, OperationType.WRITE, 'chats');
    throw err;
  }
};
