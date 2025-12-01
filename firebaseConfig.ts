// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAlDUf4p3ZwXMuzSbeA9Y8cfe7-hl4PHJg",
  authDomain: "fivem-system-9a749.firebaseapp.com",
  projectId: "fivem-system-9a749",
  storageBucket: "fivem-system-9a749.firebasestorage.app",
  messagingSenderId: "260957094422",
  appId: "1:260957094422:web:e66656da266e153789ab37",
  measurementId: "G-5LE961HWRX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
