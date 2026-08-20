import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyDA42dpbPEUwS6aOweo-cHoMdsdVnO3nHc",
    authDomain: "uponbuster.firebaseapp.com",
    projectId: "uponbuster",
    storageBucket: "uponbuster.firebasestorage.app",
    messagingSenderId: "443828007969",
    appId: "1:443828007969:web:0b280de7c42d3b8b719f60",
    measurementId: undefined
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
