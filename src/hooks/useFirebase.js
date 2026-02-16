import { useState, useEffect } from 'react';
import { fetchCollection, COLLECTIONS, isFirebaseReady } from '../lib/firebase';

// Generic hook for fetching data from Firebase
export const useFirebaseData = (collectionName) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            if (!isFirebaseReady()) {
                setLoading(false);
                return;
            }

            try {
                const result = await fetchCollection(collectionName);
                setData(result);
            } catch (err) {
                console.error(`Error loading ${collectionName}:`, err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [collectionName]);

    return { data, loading, error };
};

// Specific hooks for each collection
export const useEvents = () => useFirebaseData(COLLECTIONS.EVENTS);

export const useMedia = () => useFirebaseData(COLLECTIONS.MEDIA);
export const usePartners = () => useFirebaseData(COLLECTIONS.PARTNERS);
export const useBlogs = () => useFirebaseData(COLLECTIONS.BLOGS);
export const useDocuments = () => useFirebaseData(COLLECTIONS.DOCUMENTS);
export const useClassifieds = () => useFirebaseData(COLLECTIONS.CLASSIFIEDS);
export const usePress = () => useFirebaseData(COLLECTIONS.PRESS);

// Helper to get image URL (handles both local and Firebase URLs)
export const getImageUrl = (path, defaultPath = '/placeholder.svg') => {
    if (!path) return defaultPath;
    // If it's already a full URL (Firebase Storage), return as-is
    if (path.startsWith('http')) return path;
    // Otherwise, treat as local path
    return path;
};
