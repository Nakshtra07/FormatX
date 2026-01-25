// Auth Module - Handles Firebase Authentication

import { firebaseConfig } from './firebase-config.js';

// Firebase Auth state
let currentUser = null;
let authStateListeners = [];

// Initialize Firebase Auth
async function initializeAuth() {
    // Firebase will be loaded from CDN in service worker
    console.log('🔐 Auth module initialized');
}

// Sign in with Google using Chrome Identity API
async function signInWithGoogle() {
    return new Promise((resolve, reject) => {
        // Use chrome.identity to get Google OAuth token
        chrome.identity.getAuthToken({ interactive: true }, async (token) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            try {
                // Exchange Google token for Firebase credential
                const credential = firebase.auth.GoogleAuthProvider.credential(null, token);
                const userCredential = await firebase.auth().signInWithCredential(credential);

                currentUser = userCredential.user;

                // Create/update user profile in Firestore
                await createOrUpdateUserProfile(currentUser);

                // Notify listeners
                notifyAuthStateChange(currentUser);

                resolve(currentUser);
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Sign out
async function signOut() {
    try {
        // Revoke Chrome identity token
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
                chrome.identity.removeCachedAuthToken({ token });
            }
        });

        await firebase.auth().signOut();
        currentUser = null;
        notifyAuthStateChange(null);
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
}

// Create or update user profile in Firestore
async function createOrUpdateUserProfile(user) {
    const userRef = firebase.firestore().collection('users').doc(user.uid);
    const userDoc = await userRef.get();

    const userData = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!userDoc.exists) {
        // New user - create profile with defaults
        await userRef.set({
            ...userData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            subscription: {
                tier: 'free',
                stripeCustomerId: null,
                validUntil: null
            },
            usage: {
                formatsThisMonth: 0,
                lastResetDate: firebase.firestore.FieldValue.serverTimestamp()
            },
            settings: {
                defaultTemplate: 'ieee',
                darkMode: true
            }
        });
    } else {
        // Existing user - update login info
        await userRef.update(userData);
    }
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user is logged in
function isLoggedIn() {
    return currentUser !== null;
}

// Add auth state listener
function onAuthStateChange(callback) {
    authStateListeners.push(callback);
    // Immediately call with current state
    callback(currentUser);
}

// Notify all listeners of auth state change
function notifyAuthStateChange(user) {
    authStateListeners.forEach(callback => callback(user));
}

// Get user profile from Firestore
async function getUserProfile() {
    if (!currentUser) return null;

    const userDoc = await firebase.firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

    return userDoc.exists ? userDoc.data() : null;
}

// Export functions
export {
    initializeAuth,
    signInWithGoogle,
    signOut,
    getCurrentUser,
    isLoggedIn,
    onAuthStateChange,
    getUserProfile
};
