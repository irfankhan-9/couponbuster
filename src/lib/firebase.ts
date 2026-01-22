import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyAv8F2LSQZA6yD1MBBkH65XXAMgyXoPX18",
    authDomain: "couponbusters-c4645.firebaseapp.com",
    projectId: "couponbusters-c4645",
    storageBucket: "couponbusters-c4645.firebasestorage.app",
    messagingSenderId: "722442290180",
    appId: "1:722442290180:web:663f55ffd03a236f6de151",
    measurementId: "G-NK335HM9YG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
