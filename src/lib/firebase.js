import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase is configured
const isConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

if (!isConfigured) {
    console.warn('Firebase credentials not found. Using fallback mode.');
}

// Initialize Firebase
const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

// Collection names
export const COLLECTIONS = {
    EVENTS: 'events',

    MEDIA: 'media',
    PARTNERS: 'partners',
    BLOGS: 'blogs',
    PRESS: 'press',
    REGISTRATIONS: 'registrations',
    DOCUMENTS: 'documents',
    CLASSIFIEDS: 'classifieds'
};

// ==================== FIRESTORE HELPERS ====================

// Fetch all documents from a collection
export const fetchCollection = async (collectionName) => {
    if (!db) return [];
    try {
        const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        // If orderBy fails (no createdAt field), try without ordering
        try {
            const snapshot = await getDocs(collection(db, collectionName));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error(`Error fetching ${collectionName}:`, e);
            return [];
        }
    }
};

// Fetch a single document by ID
export const fetchDocument = async (collectionName, docId) => {
    if (!db) return null;
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching document ${docId} from ${collectionName}:`, error);
        return null;
    }
};

// Add a document to a collection
export const addDocument = async (collectionName, data) => {
    if (!db) throw new Error('Firebase not configured');
    const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date().toISOString()
    });
    return docRef.id;
};

// Update a document
export const updateDocument = async (collectionName, docId, data) => {
    if (!db) throw new Error('Firebase not configured');
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
    });
};

// Delete a document
export const deleteDocument = async (collectionName, docId) => {
    if (!db) throw new Error('Firebase not configured');
    await deleteDoc(doc(db, collectionName, docId));
};

// Check if Firebase is ready
export const isFirebaseReady = () => isConfigured && db !== null;

// ==================== FIREBASE STORAGE ====================

/**
 * Upload a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - The storage path (e.g. 'results/myfile.pdf')
 * @returns {Promise<string>} - The public download URL
 */
export const uploadFileToStorage = async (file, path) => {
    if (!storage) throw new Error('Firebase Storage not configured');
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
};

