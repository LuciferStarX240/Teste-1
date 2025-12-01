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
  apiKey: "AIzaSy...SUA_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456...",
  appId: "1:123456..."
};

// Use saved config if available, otherwise default
const firebaseConfig = savedConfig || defaultConfig;

// Check if configured (Saved config exists OR default keys have been replaced)
export const isFirebaseConfigured = !!savedConfig || (!firebaseConfig.apiKey.includes("SUA_KEY_AQUI") && !firebaseConfig.projectId.includes("seu-projeto"));

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default firebaseConfig;