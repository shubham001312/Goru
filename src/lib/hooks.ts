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

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Chat));
      setChats(chatData);
      setLoading(false);
    }, (error) => {
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
export const useSearchUsers = () => {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    // Simple search by username prefix
    const q = query(
      collection(db, 'users'),
      where('username', '>=', term),
      where('username', '<=', term + '\uf8ff'),
      limit(10)
    );
    
    // onSnapshot or getDocs? Let's use onSnapshot for consistency or just a promise
    onSnapshot(q, (snap) => {
      const users = snap.docs.map(d => d.data() as UserProfile);
      setResults(users);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });
  };

  return { search, results, loading };
};

export const startPrivateChat = async (currentUserId: string, targetUserId: string) => {
  try {
    // Check if chat already exists
    const q = query(
      collection(db, 'chats'),
      where('type', '==', 'private'),
      where('participants', 'array-contains', currentUserId)
    );
    
    // Note: we can't do array-contains on two fields, so we filter in-memory or use a combined key
    // For simplicity here, we'll just check if participants match
    // In a real app, use a unique composite ID like `uid1_uid2` (sorted)
    const chatId = [currentUserId, targetUserId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        id: chatId,
        type: 'private',
        participants: [currentUserId, targetUserId],
        createdAt: serverTimestamp(),
      });
    }
    return chatId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'chats');
    throw err;
  }
};
