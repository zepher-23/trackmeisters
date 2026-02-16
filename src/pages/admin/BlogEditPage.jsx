import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Save,
    Loader2,
    Trash2,
    Type,
    Image,
    Video,
    Link,
    Upload,
    GripVertical,
    ChevronUp,
    ChevronDown,
    Plus,
    Eye,
    EyeOff,
    Calendar
} from 'lucide-react';
import {
    fetchCollection,
    addDocument,
    updateDocument,
    deleteDocument,
    COLLECTIONS
} from '../../lib/firebase';
import { uploadToCloudinary } from '../../lib/cloudinary';
import RichTextEditor from './RichTextEditor';
import './admin.css';

const BlogEditPage = ({ onBack }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const [blog, setBlog] = useState({
        title: '',
        author: '',
        category: 'News',
        excerpt: '',
        coverImage: '',
        publishedAt: new Date().toISOString().split('T')[0],
        sections: []
    });
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    const sections = blog.sections || [];

    useEffect(() => {
        if (isEditing) {
            loadBlog();
        }
    }, [id]);

    const loadBlog = async () => {
        try {
            const blogs = await fetchCollection(COLLECTIONS.BLOGS);
            const found = blogs.find(b => b.id === id);
            if (found) {
                setBlog(found);
            } else {
                setError('Newsletter post not found');
            }
        } catch (err) {
            console.error('Error loading blog:', err);
            setError('Failed to load newsletter post');
        } finally {
            setLoading(false);
        }
    };

    const updateBlog = (updates) => {
        setBlog(prev => ({ ...prev, ...updates }));
    };

    const handleSave = async () => {
        if (!blog.title.trim()) {
            setError('Title is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Clean and filter sections before saving
            const filteredSections = sections
                .map(section => {
                    if (section.type === 'text' && section.content) {
                        // Clean up consecutive line breaks and empty paragraphs

                        // 1. Normalize all empty paragraph/div variations to a sentinel token
                        let cleanContent = section.content;

                        // 2. Collapse sequences of 3 or more sentinels to 2
                        // Matches sentinel followed by optional whitespace, 3 or more times
                        cleanContent = cleanContent.replace(/(?:___EMPTY_PARA___\s*){3,}/g, '___EMPTY_PARA___ ___EMPTY_PARA___');

                        // 3. Convert sentinels back to standard empty paragraphs
                        cleanContent = cleanContent.replace(/___EMPTY_PARA___/g, '<p><br></p>');

                        // Also handle raw <br> tags: 3+ to 2
                        cleanContent = cleanContent.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
                        return { ...section, content: cleanContent };
                    }
                    return section;
                })
                .filter(section => {
                    if (section.type === 'text') {
                        // Check for content (stripping HTML tags for "empty" check)
                        return section.content && section.content.replace(/<[^>]*>/g, '').trim().length > 0;
                    }
                    if (section.type === 'image') return section.url && section.url.trim().length > 0;
                    if (section.type === 'video') return section.youtubeId && section.youtubeId.trim().length > 0;
                    if (section.type === 'link') return section.url && section.url.trim().length > 0;
                    return true;
                });

            const blogData = { ...blog, sections: filteredSections };

            if (isEditing) {
                const { id: _, ...data } = blogData;
                await updateDocument(COLLECTIONS.BLOGS, id, data);
            } else {
                await addDocument(COLLECTIONS.BLOGS, blogData);
            }
            navigate('/admin');
        } catch (err) {
            console.error('Save error:', err);
            setError('Failed to save newsletter post. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this newsletter post?')) return;

        try {
            await deleteDocument(COLLECTIONS.BLOGS, id);
            navigate('/admin');
        } catch (err) {
            console.error('Delete error:', err);
            setError('Failed to delete newsletter post');
        }
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate('/admin');
        }
    };

    // Section management
    const addSection = (type) => {
        const newSection = {
            type,
            id: Date.now(),
            ...(type === 'text' && { content: '', sectionTitle: '' }),
            ...(type === 'image' && { url: '', caption: '' }),
            ...(type === 'video' && { youtubeId: '', title: '' }),
            ...(type === 'link' && { url: '', text: '' })
        };
        updateBlog({ sections: [...sections, newSection] });
    };

    const updateSection = (index, updates) => {
        const newSections = [...sections];
        newSections[index] = { ...newSections[index], ...updates };
        updateBlog({ sections: newSections });
    };

    const removeSection = (index) => {
        updateBlog({ sections: sections.filter((_, i) => i !== index) });
    };

    const moveSection = (index, direction) => {
        const newSections = [...sections];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newSections.length) return;
        [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
        updateBlog({ sections: newSections });
    };

    const handleCoverImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading('cover');
        try {
            const imageUrl = await uploadToCloudinary(file, 'blogs');
            updateBlog({ coverImage: imageUrl });
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setUploading(null);
        }
    };

    const handleSectionImageUpload = async (e, index) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(index);
        try {
            const imageUrl = await uploadToCloudinary(file, 'blogs');
            updateSection(index, { url: imageUrl });
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setUploading(null);
        }
    };

    const extractYoutubeId = (url) => {
        const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : url;
    };

    if (loading) {
        return (
            <div className="blog-edit-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--admin-bg)' }}>
                <div className="blog-edit-loading" style={{ textAlign: 'center' }}>
                    <Loader2 size={48} className="spin" style={{ color: 'var(--admin-accent)' }} />
                    <p style={{ color: 'var(--admin-text-secondary)', marginTop: '16px' }}>Loading newsletter...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="blog-edit-page">
            {/* Header */}
            <header className="bep-header">
                <div className="bep-header-left">
                    <button className="bep-back-btn" onClick={handleBack}>
                        <ArrowLeft size={20} />
                    </button>
                    <div className="bep-header-info">
                        <span className="bep-header-label">{isEditing ? 'Editing' : 'New Post'}</span>
                        <h1 className="bep-header-title">{blog.title || 'Untitled'}</h1>
                    </div>
                </div>
                <div className="bep-header-actions">
                    <button
                        className="bep-btn bep-btn-ghost"
                        onClick={() => setShowPreview(!showPreview)}
                    >
                        {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                        <span>Preview</span>
                    </button>
                    {isEditing && (
                        <button className="bep-btn bep-btn-danger" onClick={handleDelete}>
                            <Trash2 size={18} />
                        </button>
                    )}
                    <button
                        className="bep-btn bep-btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                        <span>{isEditing ? 'Update' : 'Publish'}</span>
                    </button>
                </div>
            </header>

            {/* Error Message */}
            {error && (
                <div className="bep-error">
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* Main Content */}
            <main className="bep-main">
                <div className="bep-container">
                    {/* Two Column Layout */}
                    <div className="bep-grid">
                        {/* Left Column - Main Content */}
                        <div className="bep-content">
                            {/* Title Input */}
                            <div className="bep-title-section">
                                <input
                                    type="text"
                                    className="bep-title-input"
                                    value={blog.title || ''}
                                    onChange={(e) => updateBlog({ title: e.target.value })}
                                    placeholder="Enter newsletter title..."
                                />
                            </div>

                            {/* Excerpt */}
                            <div className="bep-excerpt-section">
                                <textarea
                                    className="bep-excerpt-input"
                                    value={blog.excerpt || ''}
                                    onChange={(e) => updateBlog({ excerpt: e.target.value })}
                                    placeholder="Write a short excerpt that appears on newsletter cards..."
                                    rows={2}
                                />
                            </div>

                            {/* Content Sections */}
                            <div className="bep-sections">
                                <div className="bep-sections-header">
                                    <h2>Content</h2>
                                    <div className="bep-add-buttons">
                                        <button onClick={() => addSection('text')} className="bep-add-btn" title="Add Text">
                                            <Type size={16} />
                                        </button>
                                        <button onClick={() => addSection('image')} className="bep-add-btn" title="Add Image">
                                            <Image size={16} />
                                        </button>
                                        <button onClick={() => addSection('video')} className="bep-add-btn" title="Add Video">
                                            <Video size={16} />
                                        </button>
                                        <button onClick={() => addSection('link')} className="bep-add-btn" title="Add Link">
                                            <Link size={16} />
                                        </button>
                                    </div>
                                </div>

                                {sections.length === 0 ? (
                                    <div className="bep-empty-sections">
                                        <Plus size={32} />
                                        <p>Add content sections using the buttons above</p>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {sections.map((section, index) => (
                                            <motion.div
                                                key={section.id || index}
                                                className="bep-section"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                layout
                                            >
                                                <div className="bep-section-header">
                                                    <div className="bep-section-info">
                                                        <GripVertical size={14} />
                                                        <span>{section.type}</span>
                                                    </div>
                                                    <div className="bep-section-actions">
                                                        <button
                                                            onClick={() => moveSection(index, -1)}
                                                            disabled={index === 0}
                                                            title="Move up"
                                                        >
                                                            <ChevronUp size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => moveSection(index, 1)}
                                                            disabled={index === sections.length - 1}
                                                            title="Move down"
                                                        >
                                                            <ChevronDown size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => removeSection(index)}
                                                            className="danger"
                                                            title="Remove"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="bep-section-content">
                                                    {section.type === 'text' && (
                                                        <div className="bep-text-section">
                                                            <RichTextEditor
                                                                value={section.content || ''}
                                                                onChange={(content) => updateSection(index, { content })}
                                                                placeholder="Write your content..."
                                                            />
                                                        </div>
                                                    )}

                                                    {section.type === 'image' && (
                                                        <div className="bep-image-section">
                                                            <div className="bep-image-upload-area">
                                                                {section.url ? (
                                                                    <img src={section.url} alt="Preview" />
                                                                ) : (
                                                                    <label className="bep-image-placeholder">
                                                                        {uploading === index ? (
                                                                            <Loader2 size={24} className="spin" />
                                                                        ) : (
                                                                            <>
                                                                                <Upload size={24} />
                                                                                <span>Click to upload</span>
                                                                            </>
                                                                        )}
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            onChange={(e) => handleSectionImageUpload(e, index)}
                                                                            hidden
                                                                        />
                                                                    </label>
                                                                )}
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={section.url || ''}
                                                                onChange={(e) => updateSection(index, { url: e.target.value })}
                                                                placeholder="Or paste image URL"
                                                                className="bep-input"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={section.caption || ''}
                                                                onChange={(e) => updateSection(index, { caption: e.target.value })}
                                                                placeholder="Caption (optional)"
                                                                className="bep-input"
                                                            />
                                                        </div>
                                                    )}

                                                    {section.type === 'video' && (
                                                        <div className="bep-video-section">
                                                            <input
                                                                type="text"
                                                                value={section.youtubeId || ''}
                                                                onChange={(e) => updateSection(index, { youtubeId: extractYoutubeId(e.target.value) })}
                                                                placeholder="Paste YouTube URL or video ID"
                                                                className="bep-input"
                                                            />
                                                            {section.youtubeId && (
                                                                <div className="bep-video-preview">
                                                                    <iframe
                                                                        src={`https://www.youtube.com/embed/${section.youtubeId}`}
                                                                        title="Preview"
                                                                        frameBorder="0"
                                                                        allowFullScreen
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {section.type === 'link' && (
                                                        <div className="bep-link-section">
                                                            <input
                                                                type="text"
                                                                value={section.url || ''}
                                                                onChange={(e) => updateSection(index, { url: e.target.value })}
                                                                placeholder="Link URL"
                                                                className="bep-input"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={section.text || ''}
                                                                onChange={(e) => updateSection(index, { text: e.target.value })}
                                                                placeholder="Link text"
                                                                className="bep-input"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Settings */}
                        <aside className="bep-sidebar">
                            <div className="bep-sidebar-section">
                                <h3>Settings</h3>

                                <div className="bep-field">
                                    <label>Author</label>
                                    <input
                                        type="text"
                                        value={blog.author || ''}
                                        onChange={(e) => updateBlog({ author: e.target.value })}
                                        placeholder="Author name"
                                        className="bep-input"
                                    />
                                </div>

                                <div className="bep-field">
                                    <label>Category</label>
                                    <select
                                        value={blog.category || 'News'}
                                        onChange={(e) => updateBlog({ category: e.target.value })}
                                        className="bep-select"
                                    >
                                        <option value="News">News</option>
                                        <option value="Technical">Technical</option>
                                        <option value="Interview">Interview</option>
                                        <option value="Race Report">Race Report</option>
                                        <option value="Behind the Scenes">Behind the Scenes</option>
                                    </select>
                                </div>

                                <div className="bep-field">
                                    <label>
                                        <Calendar size={14} />
                                        Publish Date
                                    </label>
                                    <input
                                        type="date"
                                        value={blog.publishedAt || ''}
                                        onChange={(e) => updateBlog({ publishedAt: e.target.value })}
                                        className="bep-input"
                                    />
                                </div>
                            </div>

                            <div className="bep-sidebar-section">
                                <h3>Cover Image</h3>
                                <div className="bep-cover-upload">
                                    {blog.coverImage ? (
                                        <div className="bep-cover-preview">
                                            <img src={blog.coverImage} alt="Cover" />
                                            <button
                                                className="bep-cover-remove"
                                                onClick={() => updateBlog({ coverImage: '' })}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="bep-cover-placeholder">
                                            {uploading === 'cover' ? (
                                                <Loader2 size={24} className="spin" />
                                            ) : (
                                                <>
                                                    <Upload size={24} />
                                                    <span>Upload cover</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleCoverImageUpload}
                                                hidden
                                            />
                                        </label>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={blog.coverImage || ''}
                                    onChange={(e) => updateBlog({ coverImage: e.target.value })}
                                    placeholder="Or paste image URL"
                                    className="bep-input"
                                />
                            </div>
                        </aside>
                    </div>
                </div>
            </main>

            {/* Preview Panel */}
            <AnimatePresence>
                {showPreview && (
                    <motion.div
                        className="bep-preview-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="bep-preview-container">
                            <div className="bep-preview-header">
                                <h2>Preview</h2>
                                <button onClick={() => setShowPreview(false)}>
                                    <EyeOff size={20} />
                                </button>
                            </div>
                            <div className="bep-preview-content">
                                {/* Cover Image */}
                                <div className="preview-cover">
                                    <img
                                        src={blog.coverImage || '/blog-placeholder.webp'}
                                        alt={blog.title || 'Blog Post'}
                                        onError={(e) => { e.target.onerror = null; e.target.src = '/blog-placeholder.webp'; }}
                                    />
                                </div>

                                {/* Meta Info */}
                                <div className="preview-meta">
                                    <span className="preview-category">{blog.category || 'Uncategorized'}</span>
                                    <span className="preview-date">
                                        {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        }) : 'No date'}
                                    </span>
                                </div>

                                {/* Title */}
                                <h1 style={{ fontWeight: 800 }}>{blog.title || 'Untitled Post'}</h1>

                                {/* Author */}
                                {blog.author && (
                                    <p className="preview-author">By {blog.author}</p>
                                )}

                                {/* Excerpt */}
                                {blog.excerpt && (
                                    <p className="preview-excerpt">{blog.excerpt}</p>
                                )}

                                {/* Content Sections */}
                                <div className="preview-body">
                                    {sections.length === 0 ? (
                                        <p className="preview-empty">No content yet</p>
                                    ) : (
                                        sections.map((section, index) => (
                                            <div key={section.id || index} className="preview-section">
                                                {section.type === 'text' && (
                                                    <div
                                                        className="preview-text"
                                                        dangerouslySetInnerHTML={{ __html: section.content || '' }}
                                                    />
                                                )}

                                                {section.type === 'image' && section.url && (
                                                    <figure className="preview-image">
                                                        <img
                                                            src={section.url}
                                                            alt={section.caption || ''}
                                                            style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', display: 'block' }}
                                                            onError={(e) => { e.target.onerror = null; e.target.src = '/blog-placeholder.webp'; }}
                                                        />
                                                        {section.caption && (
                                                            <figcaption>{section.caption}</figcaption>
                                                        )}
                                                    </figure>
                                                )}

                                                {section.type === 'video' && section.youtubeId && (
                                                    <div className="preview-video">
                                                        <iframe
                                                            src={`https://www.youtube.com/embed/${section.youtubeId}`}
                                                            title={section.title || 'Video'}
                                                            frameBorder="0"
                                                            allowFullScreen
                                                        />
                                                    </div>
                                                )}

                                                {section.type === 'link' && section.url && (
                                                    <a
                                                        href={section.url}
                                                        className="preview-link"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {section.text || section.url}
                                                    </a>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                /* Blog Edit Page Styles */
                .blog-edit-page {
                    min-height: 100vh;
                    background: #09090b;
                    color: #fafafa;
                }

                .blog-edit-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    gap: 16px;
                    color: #71717a;
                }

                /* Header */
                .bep-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 20px;
                    background: #18181b;
                    border-bottom: 1px solid #27272a;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }

                .bep-header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .bep-back-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    background: transparent;
                    border: 1px solid #27272a;
                    border-radius: 8px;
                    color: #a1a1aa;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .bep-back-btn:hover {
                    background: #27272a;
                    color: #fafafa;
                }

                .bep-header-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .bep-header-label {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #71717a;
                }

                .bep-header-title {
                    font-size: 14px;
                    font-weight: 500;
                    margin: 0;
                    max-width: 200px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .bep-header-actions {
                    display: flex;
                    gap: 8px;
                }

                .bep-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }

                .bep-btn span {
                    display: none;
                }

                .bep-btn-ghost {
                    background: transparent;
                    color: #a1a1aa;
                    border: 1px solid #27272a;
                }

                .bep-btn-ghost:hover {
                    background: #27272a;
                    color: #fafafa;
                }

                .bep-btn-primary {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                }

                .bep-btn-primary:hover {
                    opacity: 0.9;
                }

                .bep-btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .bep-btn-danger {
                    background: transparent;
                    color: #ef4444;
                    border: 1px solid #27272a;
                }

                .bep-btn-danger:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                /* Error */
                .bep-error {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 20px;
                    background: rgba(239, 68, 68, 0.1);
                    border-bottom: 1px solid rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                    font-size: 13px;
                }

                .bep-error button {
                    background: none;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                    font-size: 18px;
                }

                /* Main */
                .bep-main {
                    padding: 24px;
                }

                .bep-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .bep-grid {
                    display: grid;
                    grid-template-columns: 1fr 300px;
                    gap: 24px;
                }

                /* Content Column */
                .bep-content {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .bep-title-section {
                    background: #18181b;
                    border: 1px solid #27272a;
                    border-radius: 12px;
                    padding: 4px;
                }

                .bep-title-input {
                    width: 100%;
                    padding: 16px 20px;
                    background: transparent;
                    border: none;
                    color: #fafafa;
                    font-size: 24px;
                    font-weight: 600;
                    outline: none;
                }

                .bep-title-input::placeholder {
                    color: #52525b;
                }

                .bep-excerpt-section {
                    background: #18181b;
                    border: 1px solid #27272a;
                    border-radius: 12px;
                    padding: 4px;
                }

                .bep-excerpt-input {
                    width: 100%;
                    padding: 12px 16px;
                    background: transparent;
                    border: none;
                    color: #a1a1aa;
                    font-size: 14px;
                    line-height: 1.6;
                    resize: none;
                    outline: none;
                }

                .bep-excerpt-input::placeholder {
                    color: #52525b;
                }

                /* Sections */
                .bep-sections {
                    background: #18181b;
                    border: 1px solid #27272a;
                    border-radius: 12px;
                    padding: 20px;
                }

                .bep-sections-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #27272a;
                }

                .bep-sections-header h2 {
                    font-size: 14px;
                    font-weight: 600;
                    color: #a1a1aa;
                    margin: 0;
                }

                .bep-add-buttons {
                    display: flex;
                    gap: 6px;
                }

                .bep-add-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    background: #27272a;
                    border: none;
                    border-radius: 6px;
                    color: #a1a1aa;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .bep-add-btn:hover {
                    background: #3b82f6;
                    color: white;
                }

                .bep-empty-sections {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    color: #52525b;
                    text-align: center;
                }

                .bep-empty-sections p {
                    margin: 12px 0 0 0;
                    font-size: 13px;
                }

                .bep-section {
                    background: #09090b;
                    border: 1px solid #27272a;
                    border-radius: 8px;
                    margin-bottom: 12px;
                    overflow: hidden;
                }

                .bep-section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    background: rgba(255,255,255,0.02);
                    border-bottom: 1px solid #27272a;
                }

                .bep-section-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #71717a;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .bep-section-actions {
                    display: flex;
                    gap: 4px;
                }

                .bep-section-actions button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 26px;
                    height: 26px;
                    background: transparent;
                    border: none;
                    border-radius: 4px;
                    color: #71717a;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .bep-section-actions button:hover:not(:disabled) {
                    background: #27272a;
                    color: #fafafa;
                }

                .bep-section-actions button:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                .bep-section-actions button.danger:hover {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                }

                .bep-section-content {
                    padding: 12px;
                }

                .bep-input {
                    width: 100%;
                    padding: 10px 12px;
                    background: #18181b;
                    border: 1px solid #27272a;
                    border-radius: 6px;
                    color: #fafafa;
                    font-size: 13px;
                    outline: none;
                    transition: border-color 0.2s;
                }

                .bep-input:focus {
                    border-color: #3b82f6;
                }

                .bep-input::placeholder {
                    color: #52525b;
                }

                .bep-image-section,
                .bep-video-section,
                .bep-link-section {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .bep-image-upload-area {
                    border-radius: 8px;
                    overflow: hidden;
                }

                .bep-image-upload-area img {
                    width: 100%;
                    max-height: 300px;
                    object-fit: cover;
                }

                .bep-image-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 40px;
                    background: #18181b;
                    border: 2px dashed #27272a;
                    border-radius: 8px;
                    color: #52525b;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .bep-image-placeholder:hover {
                    border-color: #3b82f6;
                    color: #3b82f6;
                }

                .bep-image-placeholder span {
                    font-size: 12px;
                }

                .bep-video-preview {
                    position: relative;
                    padding-bottom: 56.25%;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .bep-video-preview iframe {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }

                /* Sidebar */
                .bep-sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .bep-sidebar-section {
                    background: #18181b;
                    border: 1px solid #27272a;
                    border-radius: 12px;
                    padding: 16px;
                }

                .bep-sidebar-section h3 {
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #71717a;
                    margin: 0 0 16px 0;
                }

                .bep-field {
                    margin-bottom: 12px;
                }

                .bep-field:last-child {
                    margin-bottom: 0;
                }

                .bep-field label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    color: #a1a1aa;
                    margin-bottom: 6px;
                }

                .bep-select {
                    width: 100%;
                    padding: 10px 12px;
                    background: #09090b;
                    border: 1px solid #27272a;
                    border-radius: 6px;
                    color: #fafafa;
                    font-size: 13px;
                    outline: none;
                    cursor: pointer;
                }

                .bep-select:focus {
                    border-color: #3b82f6;
                }

                .bep-cover-upload {
                    margin-bottom: 10px;
                }

                .bep-cover-preview {
                    position: relative;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .bep-cover-preview img {
                    width: 100%;
                    height: 150px;
                    object-fit: cover;
                }

                .bep-cover-remove {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.7);
                    border: none;
                    border-radius: 6px;
                    color: #ef4444;
                    cursor: pointer;
                }

                .bep-cover-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 30px;
                    background: #09090b;
                    border: 2px dashed #27272a;
                    border-radius: 8px;
                    color: #52525b;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .bep-cover-placeholder:hover {
                    border-color: #3b82f6;
                    color: #3b82f6;
                }

                .bep-cover-placeholder span {
                    font-size: 12px;
                }

                .spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Desktop - Show button text */
                @media (min-width: 1024px) {
                    .bep-btn span {
                        display: inline;
                    }

                    .bep-header-title {
                        max-width: 400px;
                    }
                }

                /* Tablet */
                @media (max-width: 900px) {
                    .bep-grid {
                        grid-template-columns: 1fr;
                    }

                    .bep-sidebar {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 16px;
                    }
                }

                /* Mobile */
                @media (max-width: 640px) {
                    .bep-header {
                        padding: 10px 12px;
                    }

                    .bep-header-info {
                        display: none;
                    }

                    .bep-header-actions {
                        gap: 6px;
                    }

                    .bep-btn {
                        padding: 8px 10px;
                    }

                    .bep-main {
                        padding: 12px;
                    }

                    .bep-title-input {
                        font-size: 20px;
                        padding: 12px 14px;
                    }

                    .bep-sections {
                        padding: 14px;
                    }

                    .bep-sections-header {
                        flex-direction: column;
                        gap: 12px;
                        align-items: flex-start;
                    }

                    .bep-sidebar {
                        grid-template-columns: 1fr;
                    }

                    .bep-sidebar-section {
                        padding: 14px;
                    }
                }

                /* Preview Panel */
                .bep-preview-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 200;
                    overflow-y: auto;
                }

                .bep-preview-container {
                    max-width: 800px;
                    margin: 0 auto;
                    min-height: 100vh;
                    background: #09090b;
                }

                .bep-preview-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    background: #18181b;
                    border-bottom: 1px solid #27272a;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }

                .bep-preview-header h2 {
                    font-size: 14px;
                    font-weight: 600;
                    margin: 0;
                    color: #a1a1aa;
                }

                .bep-preview-header button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    background: #27272a;
                    border: none;
                    border-radius: 8px;
                    color: #fafafa;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .bep-preview-header button:hover {
                    background: #3f3f46;
                }

                .bep-preview-content {
                    padding: 40px 24px;
                }

                .preview-cover {
                    margin: -40px -24px 32px -24px;
                    height: 300px;
                    overflow: hidden;
                }

                .preview-cover img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .preview-meta {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .preview-category {
                    display: inline-block;
                    padding: 4px 12px;
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .preview-date {
                    font-size: 13px;
                    color: #71717a;
                }

                .preview-title {
                    font-size: 2.5rem;
                    font-weight: 700;
                    line-height: 1.2;
                    margin: 0 0 16px 0;
                    color: #fafafa;
                }

                .preview-author {
                    font-size: 14px;
                    color: #a1a1aa;
                    margin: 0 0 24px 0;
                }

                .preview-excerpt {
                    font-size: 18px;
                    line-height: 1.7;
                    color: #a1a1aa;
                    margin: 0 0 32px 0;
                    padding-bottom: 32px;
                    border-bottom: 1px solid #27272a;
                }

                .preview-body {
                    color: #d4d4d8;
                }

                .preview-empty {
                    text-align: center;
                    color: #52525b;
                    padding: 40px;
                }

                .preview-section {
                    margin-bottom: 24px;
                }

                .preview-text {
                    font-size: 16px;
                    line-height: 1.8;
                }

                .preview-text h2 {
                    font-size: 1.75rem;
                    font-weight: 600;
                    margin: 32px 0 16px 0;
                    color: #ffffff; /* --color-text-primary */
                }

                .preview-text h3 {
                    font-size: 1.35rem;
                    font-weight: 600;
                    margin: 24px 0 12px 0;
                    color: #ffffff;
                }

                .preview-text p {
                    margin: 16px 0;
                    color: #888888; /* --color-text-secondary */
                }

                .preview-text ul,
                .preview-text ol {
                    margin: 16px 0;
                    padding-left: 24px;
                }

                .preview-text li {
                    margin: 8px 0;
                }

                .preview-text blockquote {
                    margin: 24px 0;
                    padding: 20px 24px;
                    border-left: 4px solid #3b82f6;
                    background: rgba(59, 130, 246, 0.1);
                    font-style: italic;
                    border-radius: 0 8px 8px 0;
                }

                .preview-text a {
                    color: #ff2a2a; /* --color-accent */
                    text-decoration: underline;
                    text-underline-offset: 3px;
                    font-weight: 500;
                    transition: color 0.2s ease;
                }

                .preview-text a:hover {
                    color: #ffffff;
                    text-decoration: none;
                }

                .preview-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: #ff2a2a; /* --color-accent */
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 1.05rem;
                    margin: 16px 0;
                    padding-bottom: 2px;
                    border-bottom: 1px dashed #ff2a2a;
                    transition: all 0.2s ease;
                    background: transparent;
                    border-radius: 0;
                }

                .preview-link:hover {
                    color: #ffffff;
                    border-bottom-style: solid;
                    background: transparent;
                    border-color: #ffffff;
                }

                /* Fix for images in text and image sections */
                .preview-text img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 8px;
                    display: block;
                    margin: 16px 0;
                }

                .preview-image {
                    margin: 24px 0;
                    width: 100%;
                }

                @media (max-width: 640px) {
                    .bep-preview-content {
                        padding: 24px 16px;
                    }

                    .preview-cover {
                        margin: -24px -16px 24px -16px;
                        height: 200px;
                    }

                    .preview-title {
                        font-size: 1.75rem;
                    }

                    .preview-excerpt {
                        font-size: 16px;
                    }
                }
            `}</style>
        </div>
    );
};

export default BlogEditPage;
