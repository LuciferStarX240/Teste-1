import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- CONFIGURAÇÃO DO FIREBASE ---
// Tenta ler do LocalStorage (para GitHub Pages) ou usa o padrão
const getSavedConfig = () => {
  try {
    const saved = localStorage.getItem('firebase_config');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error parsing saved config", e);
  }
  return null;
};

const savedConfig = getSavedConfig();

const defaultConfig = {
  apiKey: "AIzaSyAlDUf4p3ZwXMuzSbeA9Y8cfe7-hl4PHJg",
  authDomain: "fivem-system-9a749.firebaseapp.com",
  projectId: "fivem-system-9a749",
  storageBucket: "fivem-system-9a749.firebasestorage.app",
  messagingSenderId: "260957094422",
  appId: "1:260957094422:web:e66656da266e153789ab37",
};

// Use saved config if available, otherwise default
const firebaseConfig = savedConfig || defaultConfig;

// Check if configured (Saved config exists OR default keys have been replaced)
export const isFirebaseConfigured = !!savedConfig || (!firebaseConfig.apiKey.includes("AIzaSyAlDUf4p3ZwXMuzSbeA9Y8cfe7-hl4PHJg") && !firebaseConfig.projectId.includes("seu-projeto"));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default firebaseConfig;
