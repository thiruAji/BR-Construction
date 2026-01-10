import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // Cache to prevent duplicate Firestore queries
    const userCacheRef = React.useRef({});

    // Initialize user from sessionStorage (per-tab session) on mount
    useEffect(() => {
        console.log("🔐 AuthProvider: Initializing user session from sessionStorage");
        const sessionUser = sessionStorage.getItem('current_user_session');
        if (sessionUser) {
            try {
                const userData = JSON.parse(sessionUser);
                console.log("✅ User session restored from sessionStorage:", userData.email);
                setUser(userData);
                setLoading(false);
                return; // Don't check Firebase - use sessionStorage only
            } catch (e) {
                console.error("Error parsing sessionStorage user:", e);
            }
        }
        setLoading(false); // No session found
    }, []);

    // Firebase auth listener (only for signup/login, not for logout)
    // This is now optional and only used to sync fresh user data from Firestore
    useEffect(() => {
        if (!auth) {
            console.warn("Firebase not initialized");
            return;
        }

        // Only set up listener if NO session exists (new login)
        const sessionUser = sessionStorage.getItem('current_user_session');
        if (sessionUser) {
            console.log("Session exists, skipping Firebase auth listener");
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                console.log("Firebase: User authenticated:", firebaseUser.email);
                
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Firestore timeout")), 15000)
                    );

                    const userDoc = await Promise.race([
                        getDoc(userDocRef),
                        timeoutPromise
                    ]);

                    let role = 'Member';
                    if (userDoc.exists()) {
                        role = userDoc.data().role;
                    } else {
                        console.log("Creating new user profile for:", firebaseUser.uid);
                        try {
                            await setDoc(doc(db, 'users', firebaseUser.uid), {
                                email: firebaseUser.email || '',
                                phoneNumber: firebaseUser.phoneNumber || '',
                                role: 'Member',
                                createdAt: new Date().toISOString()
                            });
                        } catch (createErr) {
                            console.error("Error creating user profile:", createErr);
                        }
                    }

                    const userData = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        phoneNumber: firebaseUser.phoneNumber,
                        role: role,
                        name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : (firebaseUser.phoneNumber || 'User'))
                    };

                    // Save ONLY to sessionStorage for this tab
                    sessionStorage.setItem('current_user_session', JSON.stringify(userData));
                    userCacheRef.current[firebaseUser.uid] = userData;
                    setUser(userData);
                    setLoading(false);
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setLoading(false);
                }
            } else {
                // Firebase signed out - only clear if no sessionStorage session
                const sessionUser = sessionStorage.getItem('current_user_session');
                if (!sessionUser) {
                    setUser(null);
                }
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const signupEmail = async (email, password, secretCode) => {
        if (!auth) throw new Error("Firebase not configured");

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const adminCode = import.meta.env.VITE_ADMIN_SIGNUP_CODE;
        const role = (secretCode && secretCode === adminCode) ? 'CEO' : 'Member';

        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            email,
            role,
            createdAt: new Date().toISOString()
        });

        // Save to sessionStorage for THIS tab
        const userData = {
            uid: userCredential.user.uid,
            email: email,
            role: role,
            name: email.split('@')[0]
        };
        sessionStorage.setItem('current_user_session', JSON.stringify(userData));
        userCacheRef.current[userCredential.user.uid] = userData;
        setUser(userData);

        return userCredential.user;
    };

    const loginEmail = async (email, password) => {
        if (!auth) throw new Error("Firebase not configured");
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Fetch user role from Firestore
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        const role = userDoc.exists() ? userDoc.data().role : 'Member';
        
        // Save to sessionStorage for THIS tab
        const userData = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            role: role,
            name: userCredential.user.displayName || email.split('@')[0]
        };
        sessionStorage.setItem('current_user_session', JSON.stringify(userData));
        userCacheRef.current[userCredential.user.uid] = userData;
        setUser(userData);
        
        return userCredential.user;
    };

    const setupRecaptcha = (elementId) => {
        if (!auth) throw new Error("Firebase not configured");
        if (!window.recaptchaVerifier) {
            try {
                // Correct signature for Firebase v9: new RecaptchaVerifier(auth, container, parameters)
                window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
                    size: 'invisible',
                    callback: (response) => {
                        // reCAPTCHA solved
                    }
                });
            } catch (e) {
                console.error('Recaptcha setup error:', e);
            }
        }
    };

    const sendPhoneOtp = async (phoneNumber) => {
        if (!auth) throw new Error("Firebase not configured");
        const appVerifier = window.recaptchaVerifier;
        return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    };

    const logout = async () => {
        try {
            // Clear ONLY this tab's sessionStorage
            sessionStorage.removeItem('current_user_session');
            sessionStorage.removeItem('temp_role');
            
            console.log("✅ Logged out - this tab only (sessionStorage cleared)");
            
            // Clear local state
            setUser(null);
            setLoading(false);
            
            // Note: We do NOT call signOut(auth) because it's global to the device
            // Other tabs with their own sessionStorage sessions will stay logged in
        } catch (error) {
            console.error("Error during logout:", error);
            throw error;
        }
    };

    const isCEO = () => {
        return user?.role === 'CEO';
    };

    const upgradeToCEO = async (secretCode) => {
        if (!auth.currentUser) {
            console.error("No authenticated user");
            return false;
        }

        const adminCode = import.meta.env.VITE_ADMIN_SIGNUP_CODE;
        const inputCode = secretCode.trim();

        console.log("Debug Upgrade:", {
            input: inputCode,
            expected: adminCode,
            hasUser: !!user,
            adminCodeExists: !!adminCode
        });

        if (!adminCode) {
            console.error("VITE_ADMIN_SIGNUP_CODE not configured in .env");
            alert("❌ ERROR: Admin code not configured. Contact administrator.");
            return false;
        }

        if (inputCode === adminCode) {
            try {
                console.log("Code matched! Updating Firestore for user:", auth.currentUser.uid);

                // Update Firestore with timeout (increased to 10s)
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Firestore update timed out")), 10000)
                );

                await Promise.race([
                    setDoc(doc(db, 'users', auth.currentUser.uid), {
                        role: 'CEO',
                        updatedAt: new Date().toISOString()
                    }, { merge: true }),
                    timeoutPromise
                ]);

                console.log("Firestore updated successfully");

                // Optimistic update
                setUser(prev => {
                    const finalUserData = {
                        ...prev,
                        role: 'CEO'
                    };
                    userCacheRef.current[auth.currentUser.uid] = finalUserData;
                    // Sync role to sessionStorage for THIS tab
                    sessionStorage.setItem('current_user_session', JSON.stringify(finalUserData));
                    return finalUserData;
                });

                // Clear any temp session storage if successful
                sessionStorage.removeItem('temp_role');

                console.log("✅ User state and cache updated to CEO role");
                return true;
            } catch (error) {
                console.error("Error upgrading role:", error);

                // FALLBACK: Allow local upgrade even if backend fails
                console.log("⚠️ Backend failed, applying local upgrade");

                setUser(prev => {
                    const finalUserData = {
                        ...prev,
                        role: 'CEO'
                    };
                    userCacheRef.current[auth.currentUser.uid] = finalUserData;
                    // Save to sessionStorage for THIS tab persistence
                    sessionStorage.setItem('current_user_session', JSON.stringify(finalUserData));
                    return finalUserData;
                });

                if (error.message.includes("timed out")) {
                    alert("⚠️ Backend Connection Failed!\n\nI have upgraded you to CEO LOCALLY so you can continue working.\n\nTo fix the backend permanently:\n1. Go to Firebase Console > Firestore Database\n2. Click 'Create Database'");
                } else {
                    alert("⚠️ Update failed: " + error.message + "\n\nSwitched to Offline CEO Mode.");
                }
                return true; // Return true so the UI shows success
            }
        } else {
            console.warn("Invalid code entered", { input: inputCode, expected: adminCode });
            return false;
        }
    };

    const value = {
        user,
        signupEmail,
        loginEmail,
        setupRecaptcha,
        sendPhoneOtp,
        logout,
        isCEO,
        upgradeToCEO,
        loading
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
