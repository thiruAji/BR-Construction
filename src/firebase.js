import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log("Firebase Config Debug:", {
    apiKey: firebaseConfig.apiKey ? "Set" : "Missing",
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Offline Persistence disabled to ensure fresh data fetching for multi-user scenarios
// This was causing data to only show in cached browsers
// Real-time listeners (onSnapshot) handle real-time updates across 10+ concurrent users
// import { enableIndexedDbPersistence } from "firebase/firestore";
// if (typeof window !== "undefined") {
//     enableIndexedDbPersistence(db).catch((err) => {
//         if (err.code === 'failed-precondition') {
//             console.warn("Persistence failed: Multiple tabs open");
//         } else if (err.code === 'unimplemented') {
//             console.warn("Persistence failed: Browser not supported");
//         }
//     });
// }

// Helper to check if configured (always true now that we use env vars)
export const isConfigured = () => {
    return !!firebaseConfig.apiKey;
};
