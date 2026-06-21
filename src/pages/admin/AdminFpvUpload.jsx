import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Upload,
    Trash2,
    Loader2,
    CheckCircle,
    AlertCircle,
    Film,
    Info,
    X,
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import { db, addDocument, updateDocument, deleteDocument, fetchCollection } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { uploadFileToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../../lib/cloudinary';
import './admin.css';

const AdminFpvUpload = () => {
    const navigate = useNavigate();

    // Database records state
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [selectedEventTitle, setSelectedEventTitle] = useState('');
    const [existingEventVideos, setExistingEventVideos] = useState([]);

    // UI state
    const gdriveApiKey = 'AIzaSyDUIZ69bZogKwLwcefr3Y2DUO9IiNIUrpU';
    const [gdriveFolderUrl, setGdriveFolderUrl] = useState('');
    const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);

    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingEventData, setLoadingEventData] = useState(false);
    const [filesQueue, setFilesQueue] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadCompleted, setUploadCompleted] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [generalSuccess, setGeneralSuccess] = useState('');

    // Local assets state
    const [localPreviews, setLocalPreviews] = useState([]);
    const [localThumbnails, setLocalThumbnails] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load events on mount
    useEffect(() => {
        const loadEvents = async () => {
            setLoadingEvents(true);
            try {
                const eventsList = await fetchCollection('events');
                // Sort events by date descending or just list them
                const sortedEvents = eventsList.sort((a, b) => new Date(b.date) - new Date(a.date));
                setEvents(sortedEvents);

                // Preselect the first completed event if available
                const completedEvt = sortedEvents.find(e => e.status === 'completed');
                if (completedEvt) {
                    setSelectedEventId(completedEvt.id);
                    setSelectedEventTitle(completedEvt.title);
                } else if (sortedEvents.length > 0) {
                    setSelectedEventId(sortedEvents[0].id);
                    setSelectedEventTitle(sortedEvents[0].title);
                }
            } catch (err) {
                console.error('Error fetching events:', err);
                setGeneralError('Failed to load events.');
            } finally {
                setLoadingEvents(false);
            }
        };
        loadEvents();
    }, []);

    // Load event-specific data (existing FPV uploads) when event selection changes
    useEffect(() => {
        if (!selectedEventId || !db) return;

        const loadEventData = async () => {
            setLoadingEventData(true);
            setExistingEventVideos([]);
            try {
                // Fetch Event details
                const eventDoc = await getDoc(doc(db, 'events', selectedEventId));
                if (eventDoc.exists()) {
                    const eventData = eventDoc.data();
                    setSelectedEventTitle(eventData.title || '');
                }

                // Fetch existing FPV videos for this event
                const existingFpvQuery = query(
                    collection(db, 'fpv_videos'),
                    where('eventId', '==', selectedEventId)
                );
                const existingFpvSnapshot = await getDocs(existingFpvQuery);
                const existingFpvList = existingFpvSnapshot.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));
                setExistingEventVideos(existingFpvList);
            } catch (err) {
                console.error('Error loading event details:', err);
            } finally {
                setLoadingEventData(false);
            }
        };

        loadEventData();
    }, [selectedEventId]);

    // Helper to sanitize strings for matching
    const cleanString = (str) => {
        if (!str) return '';
        return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // Helper to verify if filename is strictly numeric
    const isNumericString = (str) => {
        if (!str) return false;
        return /^\d+$/.test(str.trim());
    };

    // Compare files in queue with already uploaded database entries to mark them as completed
    const checkExistingVideos = (queue, existingList) => {
        return queue.map(item => {
            // If item was already uploaded successfully in this session, keep it
            if (item.status === 'success' && item.progress === 100 && !item.isAlreadyExist) return item;

            const cleanNumber = cleanString(item.vehicleNumber);
            const exists = existingList.find(ev => cleanString(ev.vehicleNumber) === cleanNumber);

            if (exists) {
                const isMatch = exists.googleDriveId === item.googleDriveId && exists.previewVideoId === item.previewVideoId;
                if (isMatch) {
                    return {
                        ...item,
                        status: 'success',
                        progress: 100,
                        isAlreadyExist: true,
                        driverName: exists.driverName || item.driverName,
                        carModel: exists.carModel || item.carModel,
                        error: ''
                    };
                } else {
                    return {
                        ...item,
                        status: 'ready',
                        progress: 0,
                        isAlreadyExist: false,
                        driverName: exists.driverName || item.driverName,
                        carModel: exists.carModel || item.carModel,
                        error: ''
                    };
                }
            } else {
                if (item.isAlreadyExist) {
                    return {
                        ...item,
                        status: 'ready',
                        progress: 0,
                        isAlreadyExist: false
                    };
                }
                return item;
            }
        });
    };

    // Update queue items when existing videos from db are loaded/reloaded
    useEffect(() => {
        if (filesQueue.length === 0) return;
        setFilesQueue(prevQueue => checkExistingVideos(prevQueue, existingEventVideos));
    }, [existingEventVideos]);

    // Auto-match local files to queue items whenever localPreviews or localThumbnails change
    useEffect(() => {
        if (filesQueue.length === 0) return;

        setFilesQueue(prevQueue => {
            let changed = false;
            const updated = prevQueue.map(item => {
                const cleanNum = cleanString(item.vehicleNumber);
                
                // Find match in localPreviews
                let previewFile = null;
                if (localPreviews.length > 0) {
                    previewFile = localPreviews.find(f => {
                        const dotIdx = f.name.lastIndexOf('.');
                        const baseName = dotIdx === -1 ? f.name : f.name.substring(0, dotIdx);
                        return cleanString(baseName) === cleanNum;
                    }) || null;
                }

                // Find match in localThumbnails
                let thumbnailFile = null;
                if (localThumbnails.length > 0) {
                    thumbnailFile = localThumbnails.find(f => {
                        const dotIdx = f.name.lastIndexOf('.');
                        const baseName = dotIdx === -1 ? f.name : f.name.substring(0, dotIdx);
                        return cleanString(baseName) === cleanNum;
                    }) || null;
                }

                if (item.localPreviewFile !== previewFile || item.localThumbnailFile !== thumbnailFile) {
                    changed = true;
                    return {
                        ...item,
                        localPreviewFile: previewFile,
                        localThumbnailFile: thumbnailFile
                    };
                }
                return item;
            });

            return changed ? updated : prevQueue;
        });
    }, [localPreviews, localThumbnails]);

    const handleLoadExistingForAttachment = () => {
        if (!existingEventVideos || existingEventVideos.length === 0) {
            setGeneralError('No existing FPV videos found in the database for this event.');
            return;
        }

        const queueItems = existingEventVideos.map(video => ({
            id: video.id,
            googleDriveId: video.googleDriveId || '',
            isGoogleDrive: video.isGoogleDrive || false,
            fileName: `COMP #${video.vehicleNumber || 'Unknown'}`,
            vehicleNumber: video.vehicleNumber,
            driverName: video.driverName || '',
            carModel: video.carModel || '',
            matchSource: 'Database',
            status: 'ready',
            progress: 0,
            error: '',
            price: video.price !== undefined ? video.price : 1000,
            previewVideoUrl: video.previewVideoUrl || '',
            thumbnailUrl: video.thumbnailUrl || '',
            fullVideoUrl: video.fullVideoUrl || '', // Make sure we preserve it
            createdAt: video.createdAt || new Date().toISOString()
        }));

        setFilesQueue(queueItems);
        setUploadCompleted(false);
        setGeneralError('');
        setGeneralSuccess(`Loaded ${queueItems.length} existing videos from database. You can now select local previews and thumbnails to attach to them.`);
    };

    const fetchGoogleDriveFiles = async () => {
        setGeneralError('');
        setGeneralSuccess('');
        setLoadingDriveFiles(true);

        let folderId = null;
        const folderMatch = gdriveFolderUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/);
        if (folderMatch) {
            folderId = folderMatch[1];
        } else if (gdriveFolderUrl.includes('?id=')) {
            const urlParams = new URLSearchParams(gdriveFolderUrl.split('?')[1]);
            folderId = urlParams.get('id');
        } else {
            folderId = gdriveFolderUrl.trim();
        }

        if (!folderId) {
            setGeneralError('Invalid Google Drive folder URL or ID. Please copy the folder link or enter its ID.');
            setLoadingDriveFiles(false);
            return;
        }

        try {
            // STEP 1: Find 'paid' and 'not paid' folders inside the root folder
            const rootSubfoldersUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&key=${gdriveApiKey}&fields=files(id,name)&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`;
            const rootResponse = await fetch(rootSubfoldersUrl);
            if (!rootResponse.ok) {
                const errorData = await rootResponse.json().catch(() => ({}));
                throw new Error(errorData.error?.message || 'Google Drive API error listing root subfolders.');
            }
            const rootData = await rootResponse.json();
            const rootFiles = rootData.files || [];

            const paidFolder = rootFiles.find(f => {
                const name = f.name.toLowerCase().trim();
                return name === 'p' || name === 'paid' || name === 'free';
            });
            const notPaidFolder = rootFiles.find(f => {
                const name = f.name.toLowerCase().trim();
                return name === 'np' || name === 'not paid' || name === 'notpaid' || name === 'premium' || name === 'paid-required';
            });

            if (!paidFolder && !notPaidFolder) {
                throw new Error("Could not find 'P' (paid) or 'NP' (not paid) folders inside the main Google Drive folder. Please ensure the structure is exactly as required.");
            }

            const allCompFolders = []; // To collect { id, name, isPaid }
            const directFiles = []; // To collect files directly under 'paid' / 'not paid' folders

            // STEP 2: Fetch competition subfolders and direct files under 'paid' folder
            if (paidFolder) {
                const paidContentsUrl = `https://www.googleapis.com/drive/v3/files?q='${paidFolder.id}'+in+parents+and+trashed=false&key=${gdriveApiKey}&fields=files(id,name,mimeType,size,thumbnailLink)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;
                const paidResponse = await fetch(paidContentsUrl);
                if (paidResponse.ok) {
                    const paidData = await paidResponse.json();
                    (paidData.files || []).forEach(f => {
                        if (f.mimeType === 'application/vnd.google-apps.folder') {
                            if (f.name && f.name.trim().length > 0) {
                                allCompFolders.push({ id: f.id, name: f.name.trim(), isPaid: true });
                            }
                        } else {
                            const idx = f.name.lastIndexOf('.');
                            const baseName = idx === -1 ? f.name : f.name.substring(0, idx);
                            if (baseName && baseName.trim().length > 0) {
                                directFiles.push({ ...f, isPaid: true });
                            }
                        }
                    });
                } else {
                    const errorData = await paidResponse.json().catch(() => ({}));
                    throw new Error(`Failed to list 'P' (paid) folder contents: ${errorData.error?.message || paidResponse.statusText}`);
                }
            }

            // STEP 3: Fetch competition subfolders and direct files under 'not paid' folder
            if (notPaidFolder) {
                const notPaidContentsUrl = `https://www.googleapis.com/drive/v3/files?q='${notPaidFolder.id}'+in+parents+and+trashed=false&key=${gdriveApiKey}&fields=files(id,name,mimeType,size,thumbnailLink)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;
                const notPaidResponse = await fetch(notPaidContentsUrl);
                if (notPaidResponse.ok) {
                    const notPaidData = await notPaidResponse.json();
                    (notPaidData.files || []).forEach(f => {
                        if (f.mimeType === 'application/vnd.google-apps.folder') {
                            if (f.name && f.name.trim().length > 0) {
                                allCompFolders.push({ id: f.id, name: f.name.trim(), isPaid: false });
                            }
                        } else {
                            const idx = f.name.lastIndexOf('.');
                            const baseName = idx === -1 ? f.name : f.name.substring(0, idx);
                            if (baseName && baseName.trim().length > 0) {
                                directFiles.push({ ...f, isPaid: false });
                            }
                        }
                    });
                } else {
                    const errorData = await notPaidResponse.json().catch(() => ({}));
                    throw new Error(`Failed to list 'NP' (not paid) folder contents: ${errorData.error?.message || notPaidResponse.statusText}`);
                }
            }

            if (allCompFolders.length === 0 && directFiles.length === 0) {
                throw new Error("No files or subfolders found inside the 'P' (paid) or 'NP' (not paid) directories.");
            }

            // STEP 4: Query files under all competition subfolders individually to avoid HTTP 400 bad query length errors
            const fetchedFiles = [];
            if (allCompFolders.length > 0) {
                const fetchPromises = allCompFolders.map(async (folder) => {
                    const queryStr = `'${folder.id}' in parents and trashed=false`;
                    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&key=${gdriveApiKey}&fields=files(id,name,mimeType,size,thumbnailLink)&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;
                    const response = await fetch(url);
                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        console.error(`Error listing subfolder ${folder.name} (${folder.id}):`, errData);
                        return [];
                    }
                    const data = await response.json();
                    return (data.files || []).map(file => ({
                        ...file,
                        parentFolderId: folder.id,
                        parentFolderName: folder.name,
                        isPaid: folder.isPaid
                    }));
                });

                const results = await Promise.all(fetchPromises);
                results.forEach(files => {
                    fetchedFiles.push(...files);
                });
            }

            // Group files by their parent folder ID
            const filesByParent = {};
            fetchedFiles.forEach(file => {
                const pId = file.parentFolderId;
                if (pId) {
                    if (!filesByParent[pId]) filesByParent[pId] = [];
                    filesByParent[pId].push(file);
                }
            });

            // Filter for video files using a robust set of extensions
            const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v', '.3gp', '.wmv', '.flv', '.mpeg', '.mpg'];
            const isVideoFile = (file) => {
                const nameLower = file.name.toLowerCase();
                const isVideoMime = file.mimeType && file.mimeType.startsWith('video/');
                const isVideoExt = videoExtensions.some(ext => nameLower.endsWith(ext));
                return isVideoMime || isVideoExt;
            };

            const subfolderVideos = fetchedFiles.filter(isVideoFile);
            const directVideos = directFiles.filter(isVideoFile);

            const newItems = [];

            // Group subfolder items
            allCompFolders.forEach(folder => {
                const folderFiles = filesByParent[folder.id] || [];
                const videoFiles = folderFiles.filter(isVideoFile);

                if (videoFiles.length === 0) {
                    newItems.push({
                        id: `warning-${folder.id}`,
                        googleDriveId: '',
                        isGoogleDrive: true,
                        fileName: `[Folder] ${folder.name}`,
                        vehicleNumber: folder.name,
                        driverName: `COMP #${folder.name}`,
                        carModel: 'FPV Footage',
                        matchSource: 'Drive Folder',
                        thumbnailLink: '',
                        status: 'missing_main',
                        progress: 0,
                        error: `No video files found inside subfolder "${folder.name}".`,
                        fileSize: 0,
                        price: folder.isPaid ? 0 : 1000,
                        previewVideoId: '',
                        previewVideoUrl: ''
                    });
                    return;
                }

                const compNameLower = folder.name.toLowerCase().trim();
                const getBaseName = (fileName) => {
                    const idx = fileName.lastIndexOf('.');
                    return idx === -1 ? fileName : fileName.substring(0, idx);
                };

                // The main file name must match exactly folder.name (the competition number or alphabetical name)
                const mainFile = videoFiles.find(file => {
                    const baseName = getBaseName(file.name).toLowerCase().trim();
                    return baseName === compNameLower;
                });

                if (!mainFile) {
                    newItems.push({
                        id: `warning-${folder.id}`,
                        googleDriveId: '',
                        isGoogleDrive: true,
                        fileName: `[Folder] ${folder.name}`,
                        vehicleNumber: folder.name,
                        driverName: `COMP #${folder.name}`,
                        carModel: 'FPV Footage',
                        matchSource: 'Drive Folder',
                        thumbnailLink: '',
                        status: 'missing_main',
                        progress: 0,
                        error: `No video file named exactly "${folder.name}" inside subfolder. Expected "${folder.name}.mp4" (found: ${videoFiles.map(v => v.name).join(', ')}).`,
                        fileSize: 0,
                        price: folder.isPaid ? 0 : 1000,
                        previewVideoId: '',
                        previewVideoUrl: ''
                    });
                    return;
                }

                newItems.push({
                    id: mainFile.id,
                    googleDriveId: mainFile.id,
                    isGoogleDrive: true,
                    fileName: mainFile.name,
                    vehicleNumber: folder.name,
                    driverName: `COMP #${folder.name}`,
                    carModel: 'FPV Footage',
                    matchSource: 'Drive Folder',
                    thumbnailLink: mainFile.thumbnailLink || '',
                    status: 'ready',
                    progress: 0,
                    error: '',
                    fileSize: mainFile.size ? Number(mainFile.size) : 0,
                    price: folder.isPaid ? 0 : 1000,
                    previewVideoId: '',
                    previewVideoUrl: ''
                });
            });

            // Group direct video items (e.g. 29.mp4 directly in paid/not paid folder)
            const getCompNumberFromFileName = (fileName) => {
                const idx = fileName.lastIndexOf('.');
                const baseName = idx === -1 ? fileName : fileName.substring(0, idx);
                return baseName && baseName.trim().length > 0 ? baseName.trim() : null;
            };

            const directFilesByComp = {};
            directVideos.forEach(file => {
                const compNum = getCompNumberFromFileName(file.name);
                if (compNum) {
                    if (!directFilesByComp[compNum]) directFilesByComp[compNum] = [];
                    directFilesByComp[compNum].push(file);
                }
            });

            Object.keys(directFilesByComp).forEach(compNum => {
                const compFiles = directFilesByComp[compNum];
                const mainFile = compFiles[0]; // Since files are named only 29.mp4, there's only one main file per comp number direct.
                if (!mainFile) return;

                const vehicleNumber = compNum;

                // Prevent duplicates if already added via subfolders
                const alreadyExists = newItems.some(item => cleanString(item.vehicleNumber) === cleanString(vehicleNumber));
                if (alreadyExists) return;

                newItems.push({
                    id: mainFile.id,
                    googleDriveId: mainFile.id,
                    isGoogleDrive: true,
                    fileName: mainFile.name,
                    vehicleNumber: vehicleNumber,
                    driverName: `COMP #${vehicleNumber}`,
                    carModel: 'FPV Footage',
                    matchSource: 'Drive Folder',
                    thumbnailLink: mainFile.thumbnailLink || '',
                    status: 'ready',
                    progress: 0,
                    error: '',
                    fileSize: mainFile.size ? Number(mainFile.size) : 0,
                    price: mainFile.isPaid ? 0 : 1000,
                    previewVideoId: '',
                    previewVideoUrl: ''
                });
            });

            if (newItems.length === 0) {
                setGeneralError('No video files found in the Google Drive directories.');
                setLoadingDriveFiles(false);
                return;
            }

            // Match against existing videos in database
            const matchedItems = checkExistingVideos(newItems, existingEventVideos);
            setFilesQueue(matchedItems);
            setUploadCompleted(false);
            setGeneralSuccess(`Fetched ${matchedItems.length} videos from Google Drive successfully.`);
        } catch (err) {
            console.error('Error fetching from Google Drive:', err);
            setGeneralError(err.message || 'Failed to retrieve files from Google Drive.');
        } finally {
            setLoadingDriveFiles(false);
        }
    };

    // Remove file from list
    const removeFile = (id) => {
        if (isUploading) return;
        setFilesQueue(prev => prev.filter(item => item.id !== id));
    };

    // Clear all files
    const clearQueue = () => {
        if (isUploading) return;
        setFilesQueue([]);
        setLocalPreviews([]);
        setLocalThumbnails([]);
        setUploadCompleted(false);
        setGeneralSuccess('');
    };

    // Handle field updates directly in table
    const handleFieldChange = (id, field, value) => {
        setFilesQueue(prev =>
            prev.map(item => {
                if (item.id !== id) return item;

                // If they change the vehicle number, update driverName automatically
                if (field === 'vehicleNumber') {
                    return {
                        ...item,
                        vehicleNumber: value,
                        driverName: `COMP #${value}`
                    };
                }

                return {
                    ...item,
                    [field]: value
                };
            })
        );
    };

    // Update upload progress
    const updateProgress = (id, progress) => {
        setFilesQueue(prev =>
            prev.map(item => (item.id === id ? { ...item, progress } : item))
        );
    };

    // Helper to update specific fields on queue items
    const updateItemState = (id, updates) => {
        setFilesQueue(prev =>
            prev.map(item => (item.id === id ? { ...item, ...updates } : item))
        );
    };

    // Start Bulk Upload process
    const startUpload = async () => {
        if (!selectedEventId) {
            setGeneralError('Please select an event first.');
            return;
        }
        if (filesQueue.length === 0) {
            setGeneralError('No files selected in queue.');
            return;
        }
        if (isUploading) return;

        setIsUploading(true);
        setGeneralError('');
        setGeneralSuccess('');

        try {
            // STEP 1: Delete all FPV videos from previous events (where eventId != selectedEventId)
            const fpvSnapshot = await getDocs(collection(db, 'fpv_videos'));
            const deletePromises = [];
            fpvSnapshot.forEach(docSnap => {
                const videoData = docSnap.data();
                if (videoData.eventId !== selectedEventId) {
                    deletePromises.push(
                        deleteDocument('fpv_videos', docSnap.id)
                            .catch(e => console.error(`Error deleting old FPV doc ${docSnap.id}:`, e))
                    );
                }
            });

            if (deletePromises.length > 0) {
                console.log(`Deleting ${deletePromises.length} older FPV documents...`);
                await Promise.all(deletePromises);
            }

            // STEP 2: Process videos and insert to Firestore
            for (let i = 0; i < filesQueue.length; i++) {
                const item = filesQueue[i];
                if (item.status === 'success' || item.status === 'missing_main') continue; // Skip already finished ones or sync issues

                // Update status to uploading/processing
                updateItemState(item.id, { status: 'uploading', statusMessage: 'Starting...', progress: 0 });

                try {
                    let previewUrl = item.previewVideoUrl || '';
                    let thumbUrl = item.thumbnailLink || '';

                    // 1. Upload local preview video if present
                    if (item.localPreviewFile) {
                        updateItemState(item.id, { statusMessage: 'Uploading preview...' });
                        previewUrl = await uploadFileToCloudinary(item.localPreviewFile, 'fpv_previews', (prog) => {
                            const maxP = item.localThumbnailFile ? 45 : 90;
                            const currentOverallP = Math.round((prog / 100) * maxP);
                            updateItemState(item.id, { progress: currentOverallP });
                        });
                    }

                    // 2. Upload local thumbnail if present
                    if (item.localThumbnailFile) {
                        updateItemState(item.id, { statusMessage: 'Uploading thumbnail...' });
                        const startP = item.localPreviewFile ? 45 : 0;
                        const maxP = item.localPreviewFile ? 45 : 90;
                        thumbUrl = await uploadFileToCloudinary(item.localThumbnailFile, 'fpv_thumbnails', (prog) => {
                            const currentOverallP = startP + Math.round((prog / 100) * maxP);
                            updateItemState(item.id, { progress: currentOverallP });
                        });
                    }

                    updateItemState(item.id, { statusMessage: 'Saving...', progress: 95 });

                    // Preserve the video URL if it was already stored or generated
                    const videoUrl = item.fullVideoUrl || (item.googleDriveId ? `https://drive.google.com/uc?export=download&id=${item.googleDriveId}&confirm=t` : '');

                    // Add/Update Firestore document
                    const newDoc = {
                        driverName: item.driverName || item.vehicleNumber,
                        vehicleNumber: item.vehicleNumber,
                        carModel: item.carModel || 'Track Car',
                        eventName: selectedEventTitle,
                        eventId: selectedEventId,
                        price: item.price !== undefined ? item.price : 1000,
                        fullVideoUrl: videoUrl,
                        thumbnailUrl: thumbUrl,
                        isGoogleDrive: item.isGoogleDrive !== undefined ? item.isGoogleDrive : true,
                        googleDriveId: item.googleDriveId || '',
                        previewVideoUrl: previewUrl,
                        previewVideoId: item.previewVideoId || '',
                        fileSize: item.fileSize || 0,
                        createdAt: item.createdAt || new Date().toISOString()
                    };

                    const cleanNumber = cleanString(item.vehicleNumber);
                    const exists = existingEventVideos.find(ev => cleanString(ev.vehicleNumber) === cleanNumber);

                    let docId;
                    if (exists) {
                        await updateDocument('fpv_videos', exists.id, newDoc);
                        docId = exists.id;
                        // Update existingEventVideos locally
                        setExistingEventVideos(prev =>
                            prev.map(ev => ev.id === docId ? { ...ev, ...newDoc, id: docId } : ev)
                        );
                    } else {
                        const addedId = await addDocument('fpv_videos', newDoc);
                        docId = addedId;
                        // Add to existingEventVideos so it stays in sync
                        setExistingEventVideos(prev => [...prev, { id: docId, ...newDoc }]);
                    }

                    // Mark as success
                    updateItemState(item.id, { status: 'success', statusMessage: 'Completed', progress: 100 });
                } catch (uploadErr) {
                    console.error(`Failed to upload ${item.fileName}:`, uploadErr);
                    updateItemState(item.id, {
                        status: 'failed',
                        statusMessage: 'Failed',
                        error: uploadErr.message || 'Upload failed'
                    });
                }
            }

            setGeneralSuccess('Bulk FPV video upload process completed.');
            setUploadCompleted(true);
        } catch (err) {
            console.error('General bulk upload failure:', err);
            setGeneralError(err.message || 'Bulk upload process failed.');
        } finally {
            setIsUploading(false);
        }
    };

    // Delete all FPV data from database and Cloudinary
    const handleDeleteAllFpv = async () => {
        if (!window.confirm("ARE YOU ABSOLUTELY SURE? This will permanently delete all FPV video records from the database and delete all associated preview videos and thumbnails from Cloudinary, making the public FPV page blank! This action CANNOT be undone.")) {
            return;
        }

        setIsDeleting(true);
        setGeneralError('');
        setGeneralSuccess('');

        try {
            const fpvQuery = query(collection(db, 'fpv_videos'));
            const snapshot = await getDocs(fpvQuery);

            let deletedCloudinaryCount = 0;
            let deletedDbCount = 0;

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const docId = docSnap.id;

                // Delete preview video from Cloudinary
                if (data.previewVideoUrl && data.previewVideoUrl.includes('cloudinary.com')) {
                    const publicId = getPublicIdFromUrl(data.previewVideoUrl);
                    if (publicId) {
                        try {
                            await deleteFromCloudinary(publicId, 'video');
                            deletedCloudinaryCount++;
                        } catch (err) {
                            console.error(`Failed to delete preview video ${publicId} from Cloudinary:`, err);
                        }
                    }
                }

                // Delete thumbnail from Cloudinary
                if (data.thumbnailUrl && data.thumbnailUrl.includes('cloudinary.com')) {
                    const publicId = getPublicIdFromUrl(data.thumbnailUrl);
                    if (publicId) {
                        try {
                            await deleteFromCloudinary(publicId, 'image');
                            deletedCloudinaryCount++;
                        } catch (err) {
                            console.error(`Failed to delete thumbnail ${publicId} from Cloudinary:`, err);
                        }
                    }
                }

                // Delete from Firestore
                await deleteDocument('fpv_videos', docId);
                deletedDbCount++;
            }

            setGeneralSuccess(`Successfully deleted all FPV data: ${deletedDbCount} database records and ${deletedCloudinaryCount} Cloudinary assets removed.`);
            setExistingEventVideos([]);
            setFilesQueue([]);
            setLocalPreviews([]);
            setLocalThumbnails([]);
        } catch (err) {
            console.error("Failed to delete all FPV data:", err);
            setGeneralError(err.message || "Failed to delete all FPV data.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Calculate queue stats
    const queueStats = useMemo(() => {
        const total = filesQueue.length;
        const uploaded = filesQueue.filter(f => f.status === 'success').length;
        const failed = filesQueue.filter(f => f.status === 'failed').length;
        const uploading = filesQueue.filter(f => f.status === 'uploading').length;
        const pending = filesQueue.filter(f => f.status === 'ready').length;
        const warnings = filesQueue.filter(f => f.status === 'missing_main').length;
        return { total, uploaded, failed, uploading, pending, warnings };
    }, [filesQueue]);

    const missingPreviews = useMemo(() => {
        return filesQueue.filter(f => f.status !== 'missing_main' && !f.localPreviewFile && !f.previewVideoUrl);
    }, [filesQueue]);

    const missingMains = useMemo(() => {
        return filesQueue.filter(f => f.status === 'missing_main');
    }, [filesQueue]);

    return (
        <div className="admin-dashboard">
            <div className="admin-main" style={{ marginLeft: 0 }}>
                {/* Header */}
                <div className="admin-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => !isUploading && navigate('/admin')}
                            disabled={isUploading}
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '8px', cursor: isUploading ? 'not-allowed' : 'pointer' }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 style={{ marginBottom: '4px', fontSize: '24px' }}>Bulk FPV Video Upload</h1>
                            <p style={{ color: 'var(--admin-text-secondary)', fontSize: '14px', margin: 0 }}>
                                Upload track session FPV video files using competition numbers as filenames.
                            </p>
                        </div>
                    </div>
                    <div className="w-full sm:w-auto">
                        <button
                            onClick={handleDeleteAllFpv}
                            disabled={isUploading || isDeleting}
                            className="admin-btn admin-btn-danger w-full sm:w-auto justify-center"
                            style={{ gap: '8px' }}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 size={16} className="spin" />
                                    Deleting FPV Data...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} />
                                    Delete All FPV Data
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* General Notifications */}
                {generalError && (
                    <div className="admin-error" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={20} />
                        <span>{generalError}</span>
                    </div>
                )}
                {generalSuccess && (
                    <div style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid #22c55e',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        color: '#22c55e',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <CheckCircle size={20} />
                        <span>{generalSuccess}</span>
                    </div>
                )}

                {/* Config Card */}
                <div className="admin-card" style={{ marginBottom: '24px' }}>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-5 items-end">

                        {/* Event Selection */}
                        <div className="admin-form-group" style={{ marginBottom: 0 }}>
                            <label className="admin-form-label">
                                Select Event Context *
                            </label>
                            {loadingEvents ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--admin-text-secondary)', height: '40px' }}>
                                    <Loader2 size={16} className="spin" />
                                    <span style={{ fontSize: '13px' }}>Loading events list...</span>
                                </div>
                            ) : (
                                <select
                                    className="admin-form-select"
                                    value={selectedEventId}
                                    disabled={isUploading}
                                    onChange={(e) => {
                                        setSelectedEventId(e.target.value);
                                        const selected = events.find(ev => ev.id === e.target.value);
                                        if (selected) setSelectedEventTitle(selected.title);
                                    }}
                                >
                                    <option value="">-- Choose Completed Event --</option>
                                    {events.map(ev => (
                                        <option key={ev.id} value={ev.id}>
                                            {ev.title} ({ev.status})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={startUpload}
                                disabled={isUploading || filesQueue.length === 0 || !selectedEventId}
                                className="admin-btn admin-btn-primary"
                                style={{ flex: 1, justifyContent: 'center' }}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 size={16} className="spin" />
                                        Syncing Firestore...
                                    </>
                                ) : queueStats.failed > 0 ? (
                                    <>
                                        <RefreshCw size={16} />
                                        Retry Failed
                                    </>
                                ) : (queueStats.uploaded > 0 && queueStats.pending > 0) ? (
                                    <>
                                        <Upload size={16} />
                                        Resume Sync
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        Sync to Firestore
                                    </>
                                )}
                            </button>
                            {filesQueue.length > 0 && (
                                <button
                                    onClick={clearQueue}
                                    disabled={isUploading}
                                    className="admin-btn admin-btn-danger"
                                    title="Clear Queue"
                                    style={{ padding: '10px 14px' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                    </div>

                    <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.1)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--admin-text-secondary)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}>
                        <Info size={16} className="text-primary" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ margin: 0, lineHeight: 1.5 }}>
                            <strong>Instructions:</strong> Enter your FPV footage folder link. The sync will traverse the folder structure, look for <code>P</code> (paid) and <code>NP</code> (not paid) directories, and auto-match competition folders.
                            <br />
                            <span style={{ color: 'var(--admin-danger)', fontWeight: 'bold' }}>
                                Warning: Syncing will permanently delete all FPV videos belonging to previous events from the database.
                            </span>
                        </p>
                    </div>
                </div>

                {/* Google Drive Sync Panel */}
                {!isUploading && !uploadCompleted && (
                    <div style={{
                        background: 'var(--admin-surface-glass)',
                        border: '1px solid var(--admin-border)',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '24px'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--admin-text)', marginTop: 0 }}>
                            Google Drive Sync Settings
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '20px' }}>
                            <div className="admin-form-group" style={{ marginBottom: 0 }}>
                                <label className="admin-form-label">Google Drive Folder URL *</label>
                                <input
                                    type="text"
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    value={gdriveFolderUrl}
                                    onChange={(e) => setGdriveFolderUrl(e.target.value)}
                                    className="admin-form-input"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end w-full gap-4">
                            <button
                                onClick={handleLoadExistingForAttachment}
                                disabled={loadingDriveFiles || !selectedEventId}
                                className="admin-btn admin-btn-secondary w-full sm:w-auto justify-center"
                                style={{ gap: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                <RefreshCw size={16} />
                                Load DB Videos for Attachment
                            </button>
                            <button
                                onClick={fetchGoogleDriveFiles}
                                disabled={loadingDriveFiles || !gdriveApiKey || !gdriveFolderUrl || !selectedEventId}
                                className="admin-btn admin-btn-primary w-full sm:w-auto justify-center"
                                style={{ gap: '8px' }}
                            >
                                {loadingDriveFiles ? (
                                    <>
                                        <Loader2 size={16} className="spin" />
                                        Syncing Folder...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={16} />
                                        Sync Google Drive Folder
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Local Assets Upload Panel */}
                {!isUploading && !uploadCompleted && filesQueue.length > 0 && (
                    <div style={{
                        background: 'var(--admin-surface-glass)',
                        border: '1px solid var(--admin-border)',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '24px'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--admin-text)', marginTop: 0 }}>
                            Local Preview & Thumbnail Upload
                        </h3>
                        <p style={{ color: 'var(--admin-text-secondary)', fontSize: '13px', marginTop: 0, marginBottom: '20px' }}>
                            Select local preview videos and thumbnail images in bulk. They will be auto-matched to the synced Google Drive files by filename (e.g. <code>JohnDoe.mp4</code> or <code>JohnDoe.jpg</code> matches driver <code>JohnDoe</code>).
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Previews Dropzone */}
                            <div>
                                <label className="admin-form-label">Bulk Local Previews (Videos)</label>
                                <div style={{
                                    border: '1px dashed var(--admin-border-light)',
                                    borderRadius: '10px',
                                    padding: '20px',
                                    textAlign: 'center',
                                    background: 'rgba(0,0,0,0.2)',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }} className="hover-border-primary">
                                    <input
                                        type="file"
                                        multiple
                                        accept="video/*"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            const validFiles = files.filter(f => {
                                                const dotIdx = f.name.lastIndexOf('.');
                                                const baseName = dotIdx === -1 ? f.name : f.name.substring(0, dotIdx);
                                                return baseName && baseName.trim().length > 0;
                                            });
                                            setLocalPreviews(validFiles);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            opacity: 0,
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <Film size={24} style={{ color: 'var(--admin-text-secondary)', marginBottom: '8px', margin: '0 auto' }} />
                                    <div style={{ fontSize: '13px', fontWeight: '600' }}>
                                        {localPreviews.length > 0 ? `${localPreviews.length} previews selected` : 'Choose preview videos'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', marginTop: '4px' }}>
                                        Drag & drop or click to select
                                    </div>
                                </div>
                            </div>

                            {/* Thumbnails Dropzone */}
                            <div>
                                <label className="admin-form-label">Bulk Local Thumbnails (Images)</label>
                                <div style={{
                                    border: '1px dashed var(--admin-border-light)',
                                    borderRadius: '10px',
                                    padding: '20px',
                                    textAlign: 'center',
                                    background: 'rgba(0,0,0,0.2)',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }} className="hover-border-primary">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            const validFiles = files.filter(f => {
                                                const dotIdx = f.name.lastIndexOf('.');
                                                const baseName = dotIdx === -1 ? f.name : f.name.substring(0, dotIdx);
                                                return baseName && baseName.trim().length > 0;
                                            });
                                            setLocalThumbnails(validFiles);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            opacity: 0,
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <Upload size={24} style={{ color: 'var(--admin-text-secondary)', marginBottom: '8px', margin: '0 auto' }} />
                                    <div style={{ fontSize: '13px', fontWeight: '600' }}>
                                        {localThumbnails.length > 0 ? `${localThumbnails.length} thumbnails selected` : 'Choose thumbnail images'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', marginTop: '4px' }}>
                                        Drag & drop or click to select
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Queue Summary Panel */}
                {filesQueue.length > 0 && (
                    <div className="admin-card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
                                Upload Queue ({queueStats.total} files)
                            </h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:text-sm text-[var(--admin-text-secondary)]">
                                <span>Pending: <strong style={{ color: '#eab308' }}>{queueStats.pending}</strong></span>
                                {queueStats.uploading > 0 && <span>Uploading: <strong style={{ color: 'var(--admin-primary)' }}>{queueStats.uploading}</strong></span>}
                                <span>Success: <strong style={{ color: '#22c55e' }}>{queueStats.uploaded}</strong></span>
                                {queueStats.failed > 0 && <span>Failed: <strong style={{ color: '#ef4444' }}>{queueStats.failed}</strong></span>}
                                {queueStats.warnings > 0 && <span>Sync Issues: <strong style={{ color: '#f87171' }}>{queueStats.warnings}</strong></span>}
                            </div>
                        </div>

                        {/* Progress Bar overall */}
                        {isUploading && (
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(queueStats.uploaded / queueStats.total) * 100}%`,
                                    height: '100%',
                                    background: 'var(--admin-primary)',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        )}

                        {/* Warnings details block */}
                        {(missingPreviews.length > 0 || missingMains.length > 0) && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '8px',
                                padding: '16px',
                                marginTop: '16px',
                                fontSize: '13px',
                                color: '#f87171',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                    <AlertCircle size={18} style={{ color: '#ef4444' }} />
                                    <span>Sync & Match Warnings Found:</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', listStyleType: 'disc' }}>
                                    {missingMains.length > 0 && (
                                        <li>
                                            <strong>{missingMains.length} folder(s) missing main video file:</strong>{' '}
                                            {missingMains.map(m => m.vehicleNumber).join(', ')}
                                            <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', marginTop: '2px' }}>
                                                Ensure each subfolder in Drive has a video file named exactly matching the subfolder (e.g. folder <code>JohnDoe</code> must contain <code>JohnDoe.mp4</code>).
                                            </div>
                                        </li>
                                    )}
                                    {missingPreviews.length > 0 && (
                                        <li>
                                            <strong>{missingPreviews.length} item(s) missing local preview video:</strong>{' '}
                                            {missingPreviews.map(m => m.vehicleNumber).join(', ')}
                                            <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', marginTop: '2px' }}>
                                                Select local preview video files (e.g. <code>JohnDoe.mp4</code>) in the bulk dropzone above to match and upload them.
                                            </div>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Queue Table */}
                {filesQueue.length > 0 && (
                    <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>File Name</th>
                                        <th style={{ width: '150px' }}>Comp #</th>
                                        <th style={{ width: '125px' }}>Price</th>
                                        <th style={{ width: '150px' }}>Preview Source</th>
                                        <th style={{ width: '180px' }}>Status</th>
                                        <th style={{ width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filesQueue.map((item) => (
                                        <tr 
                                            key={item.id}
                                            style={item.status === 'missing_main' ? { background: 'rgba(239, 68, 68, 0.04)', borderLeft: '4px solid #ef4444' } : {}}
                                        >
                                            <td style={{ fontSize: '13px', color: 'var(--admin-text)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {/* Thumbnail preview */}
                                                    <div style={{
                                                        width: '56px',
                                                        height: '40px',
                                                        borderRadius: '6px',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        overflow: 'hidden',
                                                        border: '1px solid var(--admin-border)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        {item.localThumbnailFile ? (
                                                            <img
                                                                src={URL.createObjectURL(item.localThumbnailFile)}
                                                                alt="Local matched thumbnail"
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        ) : item.thumbnailLink ? (
                                                            <img
                                                                src={item.thumbnailLink}
                                                                alt="GDrive thumbnail"
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <Upload size={16} style={{ color: 'var(--admin-text-secondary)' }} />
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        <span style={{ fontWeight: '500' }}>{item.fileName}</span>
                                                        <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>
                                                            {`${(item.fileSize / (1024 * 1024)).toFixed(2)} MB`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={item.vehicleNumber}
                                                    disabled={isUploading || item.status === 'success' || item.status === 'missing_main'}
                                                    onChange={(e) => handleFieldChange(item.id, 'vehicleNumber', e.target.value)}
                                                    className="admin-form-input"
                                                    style={{ height: '32px', fontSize: '13px', padding: '4px 8px', margin: 0, fontFamily: 'monospace' }}
                                                />
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    background: item.price === 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                    color: item.price === 0 ? '#22c55e' : '#ef4444',
                                                    display: 'inline-block'
                                                }}>
                                                    {item.price === 0 ? 'FREE' : `₹${item.price}`}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {item.status === 'missing_main' ? (
                                                        <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)' }}>-</span>
                                                    ) : item.localPreviewFile ? (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                            color: '#10b981',
                                                            display: 'inline-block'
                                                        }} title={item.localPreviewFile.name}>
                                                            Local Matched
                                                        </span>
                                                    ) : item.previewVideoUrl ? (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            background: 'rgba(59, 130, 246, 0.15)',
                                                            color: '#3b82f6',
                                                            display: 'inline-block'
                                                        }}>
                                                            GDrive Resolved
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#ef4444',
                                                            display: 'inline-block'
                                                        }}>
                                                            No Preview
                                                        </span>
                                                    )}
                                                    {item.status !== 'missing_main' && (item.localPreviewFile || item.localThumbnailFile) && (
                                                        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: '500' }}>
                                                            {item.localPreviewFile && item.localThumbnailFile ? '✓ Video & Image' : item.localPreviewFile ? '✓ Video matched' : '✓ Image matched'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {item.status === 'missing_main' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span style={{ fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                                                <AlertCircle size={14} /> Sync Issue
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: 'rgba(239, 68, 68, 0.85)', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: '240px' }} title={item.error}>
                                                                {item.error}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {item.status === 'ready' && (
                                                        <span style={{ fontSize: '12px', color: 'var(--admin-text-secondary)' }}>Ready</span>
                                                    )}
                                                    {item.status === 'uploading' && (
                                                        <div style={{ width: '100%' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--admin-text-secondary)', marginBottom: '2px' }}>
                                                                <span>{item.statusMessage || 'Uploading...'}</span>
                                                                <span>{item.progress}%</span>
                                                            </div>
                                                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${item.progress}%`, height: '100%', background: 'var(--admin-primary)' }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {item.status === 'success' && (
                                                        <span style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                                            <CheckCircle size={14} /> {item.isAlreadyExist ? 'Already in DB' : 'Completed'}
                                                        </span>
                                                    )}
                                                    {item.status === 'failed' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span style={{ fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                                                <AlertCircle size={14} /> Failed
                                                            </span>
                                                            {item.error && <span style={{ fontSize: '10px', color: 'rgba(239, 68, 68, 0.7)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.error}>{item.error}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {(item.status === 'success' || item.status === 'failed') && (
                                                        <button
                                                            onClick={() => {
                                                                setFilesQueue(prev =>
                                                                    prev.map(it => (
                                                                        it.id === item.id
                                                                            ? { ...it, status: 'ready', progress: 0, error: '', isAlreadyExist: false }
                                                                            : it
                                                                    ))
                                                                );
                                                            }}
                                                            disabled={isUploading}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: isUploading ? 'var(--admin-border)' : 'var(--admin-text-secondary)',
                                                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                                                padding: '4px'
                                                            }}
                                                            className="hover-text-primary"
                                                            title="Reset status to upload again"
                                                        >
                                                            <RefreshCw size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => removeFile(item.id)}
                                                        disabled={isUploading}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: isUploading ? 'var(--admin-border)' : 'var(--admin-text-secondary)',
                                                            cursor: isUploading ? 'not-allowed' : 'pointer',
                                                            padding: '4px'
                                                        }}
                                                        className="hover-text-danger"
                                                        title="Remove File"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminFpvUpload;