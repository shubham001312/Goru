import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
export const storage = getStorage(app);

// Initialize messaging only if supported (browser)
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Connectivity check based on SDK recommendation
import { doc, getDocFromServer } from 'firebase/firestore';

async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'test'));
  } catch (error: any) {
    if (error?.message?.includes('offline')) {
      console.error("Goru: Firebase is offline. Check your connection.");
    }
  }
}
testConnection();
