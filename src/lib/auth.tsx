import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from './error-handler';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signUpWithUsername: (username: string, password: string, displayName: string) => Promise<void>;
  signInWithUsername: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Helper to convert username to synthesized email
const usernameToEmail = (username: string) => `${username.toLowerCase()}@goru.chat`;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        
        // Request location if not set or just as an update
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              await updateDoc(docRef, {
                location: {
                  lat: latitude,
                  lng: longitude,
                }
              });
            } catch (e) {
              handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
            }
          }, (err) => console.log('Location access denied'), { timeout: 10000 });
        }
      } else {
        setProfile(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const { user: u } = result;
      
      const docRef = doc(db, 'users', u.uid);
      const snap = await getDoc(docRef);
      const isAdmin = u.email === 'shubham.mallick1440@gmail.com' || u.email === 'shubham93328@gmail.com';

      if (!snap.exists()) {
        const username = u.email?.split('@')[0].replace(/[^a-z0-9]/g, '') || `user${Math.floor(Math.random() * 10000)}`;
        const newProfile: UserProfile = {
          uid: u.uid,
          displayName: u.displayName || 'Goru User',
          username: username,
          photoURL: u.photoURL || undefined,
          createdAt: new Date().toISOString(),
          isOnline: true,
          isAdmin: isAdmin
        };
        await setDoc(docRef, {
          ...newProfile,
          createdAt: serverTimestamp()
        });
        setProfile(newProfile);
      } else {
        if (isAdmin && !snap.data().isAdmin) {
          try {
            await updateDoc(docRef, { isAdmin: true });
          } catch (e) {
            handleFirestoreError(e, OperationType.UPDATE, `users/${u.uid}`);
          }
        }
        await fetchProfile(u.uid);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users`);
      throw err;
    }
  };

  const signUpWithUsername = async (username: string, password: string, displayName: string) => {
    const usernameKey = username.toLowerCase().trim();
    try {
      // 1. Check if username is taken in the usernames collection
      const usernameRef = doc(db, 'usernames', usernameKey);
      const usernameSnap = await getDoc(usernameRef);
      if (usernameSnap.exists()) {
        throw new Error('Username is already taken');
      }

      // 2. Create Auth user with synthesized email
      const email = usernameToEmail(usernameKey);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // 3. Create Firestore profile and reserve username
      const newProfile: UserProfile = {
        uid: result.user.uid,
        displayName,
        username: usernameKey,
        createdAt: new Date().toISOString(),
        isOnline: true,
      };
      
      // We should ideally use a batch here, but for simplicity:
      await setDoc(doc(db, 'users', result.user.uid), {
        ...newProfile,
        createdAt: serverTimestamp()
      });
      
      await setDoc(usernameRef, {
        uid: result.user.uid
      });
      
      setProfile(newProfile);
    } catch (err) {
      console.error('Sign up error:', err);
      throw err;
    }
  };

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const email = usernameToEmail(username);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error('Sign in error:', err);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signIn, 
      signUpWithUsername,
      signInWithUsername,
      logout,
      refreshProfile: () => user ? fetchProfile(user.uid) : Promise.resolve()
    }}>
      {children}
    </AuthContext.Provider>
  );
};
