import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    Trash2,
    Type,
    Image,
    Video,
    Link,
    GripVertical,
    Upload,
    Loader2,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import { uploadToCloudinary } from '../../lib/cloudinary';

const BlogEditor = ({ blog, onChange, onImageUpload }) => {
    const [uploading, setUploading] = useState(null);

    // Initialize sections if not present
    const sections = blog.sections || [];

    const updateBlog = (updates) => {
        onChange({ ...blog, ...updates });
    };

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

    const extractYoutubeId = (url) => {
        const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : url;
    };

    const renderSectionEditor = (section, index) => {
        return (
            <motion.div
                key={section.id || index}
                className="section-editor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="section-header">
                    <div className="section-drag">
                        <GripVertical size={16} />
                        <span className="section-type">{section.type}</span>
                    </div>
                    <div className="section-actions">
                        <button onClick={() => moveSection(index, -1)} disabled={index === 0}>
                            <ChevronUp size={16} />
                        </button>
                        <button onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1}>
                            <ChevronDown size={16} />
                        </button>
                        <button onClick={() => removeSection(index)} className="danger">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {section.type === 'text' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                            type="text"
                            className="admin-form-input"
                            value={section.sectionTitle || ''}
                            onChange={(e) => updateSection(index, { sectionTitle: e.target.value })}
                            placeholder="Section Title (for Table of Contents)"
                            style={{ fontWeight: 600 }}
                        />
                        <textarea
                            className="admin-form-textarea"
                            value={section.content || ''}
                            onChange={(e) => updateSection(index, { content: e.target.value })}
                            placeholder="Enter paragraph text..."
                            rows={4}
                        />
                    </div>
                )}

                {section.type === 'image' && (
                    <div className="image-section">
                        <div className="image-upload-row">
                            <label className="admin-form-label" style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                Image Source
                                <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 'normal' }}>Rec: 1200px width (Max 5MB)</span>
                            </label>
                        </div>
                        <div className="image-upload-row">
                            <input
                                type="text"
                                className="admin-form-input"
                                value={section.url || ''}
                                onChange={(e) => updateSection(index, { url: e.target.value })}
                                placeholder="Image URL or upload"
                            />
                            <label className="upload-btn">
                                {uploading === index ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                                <input type="file" accept="image/*" onChange={(e) => handleSectionImageUpload(e, index)} hidden />
                            </label>
                        </div>
                        {section.url && <img src={section.url} alt="Preview" className="image-preview" />}
                        <input
                            type="text"
                            className="admin-form-input"
                            value={section.caption || ''}
                            onChange={(e) => updateSection(index, { caption: e.target.value })}
                            placeholder="Image caption (optional)"
                        />
                    </div>
                )}

                {section.type === 'video' && (
                    <div className="video-section">
                        <input
                            type="text"
                            className="admin-form-input"
                            value={section.youtubeId || ''}
                            onChange={(e) => updateSection(index, { youtubeId: extractYoutubeId(e.target.value) })}
                            placeholder="YouTube URL or video ID"
                        />
                        <input
                            type="text"
                            className="admin-form-input"
                            value={section.title || ''}
                            onChange={(e) => updateSection(index, { title: e.target.value })}
                            placeholder="Video title (optional)"
                        />
                        {section.youtubeId && (
                            <div className="video-preview">
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
                    <div className="link-section">
                        <input
                            type="text"
                            className="admin-form-input"
                            value={section.url || ''}
                            onChange={(e) => updateSection(index, { url: e.target.value })}
                            placeholder="Link URL"
                        />
                        <input
                            type="text"
                            className="admin-form-input"
                            value={section.text || ''}
                            onChange={(e) => updateSection(index, { text: e.target.value })}
                            placeholder="Link text"
                        />
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="blog-editor">
            {/* Basic Info */}
            <div className="admin-form-group">
                <label className="admin-form-label">Blog Title</label>
                <input
                    type="text"
                    className="admin-form-input"
                    value={blog.title || ''}
                    onChange={(e) => updateBlog({ title: e.target.value })}
                    placeholder="Enter blog title"
                />
            </div>

            <div className="admin-form-row">
                <div className="admin-form-group">
                    <label className="admin-form-label">Author</label>
                    <input
                        type="text"
                        className="admin-form-input"
                        value={blog.author || ''}
                        onChange={(e) => updateBlog({ author: e.target.value })}
                        placeholder="Author name"
                    />
                </div>
                <div className="admin-form-group">
                    <label className="admin-form-label">Category</label>
                    <select
                        className="admin-form-select"
                        value={blog.category || 'News'}
                        onChange={(e) => updateBlog({ category: e.target.value })}
                    >
                        <option value="News">News</option>
                        <option value="Technical">Technical</option>
                        <option value="Interview">Interview</option>
                        <option value="Race Report">Race Report</option>
                        <option value="Behind the Scenes">Behind the Scenes</option>
                    </select>
                </div>
            </div>

            <div className="admin-form-group">
                <label className="admin-form-label">Excerpt</label>
                <textarea
                    className="admin-form-textarea"
                    value={blog.excerpt || ''}
                    onChange={(e) => updateBlog({ excerpt: e.target.value })}
                    placeholder="Short description for blog cards..."
                    rows={2}
                />
            </div>

            {/* Cover Image */}
            <div className="admin-form-group">
                <label className="admin-form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Cover Image
                    <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary)', fontWeight: 'normal' }}>Rec: 1920x1080px (Max 5MB)</span>
                </label>
                <div className="image-upload-row">
                    <input
                        type="text"
                        className="admin-form-input"
                        value={blog.coverImage || ''}
                        onChange={(e) => updateBlog({ coverImage: e.target.value })}
                        placeholder="Cover image URL or upload"
                    />
                    <label className="upload-btn">
                        {uploading === 'cover' ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                        <input type="file" accept="image/*" onChange={handleCoverImageUpload} hidden />
                    </label>
                </div>
                {blog.coverImage && <img src={blog.coverImage} alt="Cover" className="image-preview" />}
            </div>

            {/* Sections */}
            <div className="sections-container">
                <label className="admin-form-label">Content Sections</label>

                {sections.map((section, index) => renderSectionEditor(section, index))}

                <div className="add-section-buttons">
                    <button onClick={() => addSection('text')} className="add-section-btn">
                        <Type size={16} /> Text
                    </button>
                    <button onClick={() => addSection('image')} className="add-section-btn">
                        <Image size={16} /> Image
                    </button>
                    <button onClick={() => addSection('video')} className="add-section-btn">
                        <Video size={16} /> Video
                    </button>
                    <button onClick={() => addSection('link')} className="add-section-btn">
                        <Link size={16} /> Link
                    </button>
                </div>
            </div>

            <style>{`
                .blog-editor {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .sections-container {
                    margin-top: 16px;
                }

                .section-editor {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--admin-border);
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 12px;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .section-drag {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--admin-text-secondary);
                }

                .section-type {
                    text-transform: capitalize;
                    font-size: 12px;
                    font-weight: 600;
                }

                .section-actions {
                    display: flex;
                    gap: 4px;
                }

                .section-actions button {
                    background: rgba(255, 255, 255, 0.05);
                    border: none;
                    padding: 6px;
                    border-radius: 4px;
                    cursor: pointer;
                    color: var(--admin-text-secondary);
                    transition: all 0.2s;
                }

                .section-actions button:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--admin-text);
                }

                .section-actions button:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                .section-actions button.danger:hover {
                    background: rgba(244, 67, 54, 0.2);
                    color: #f44336;
                }

                .image-upload-row {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .image-upload-row .admin-form-input {
                    flex: 1;
                }

                .upload-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 16px;
                    background: var(--admin-accent);
                    border-radius: 8px;
                    cursor: pointer;
                    color: white;
                    transition: opacity 0.2s;
                }

                .upload-btn:hover {
                    opacity: 0.9;
                }

                .image-preview {
                    max-width: 100%;
                    max-height: 200px;
                    border-radius: 8px;
                    margin: 8px 0;
                }

                .video-preview {
                    position: relative;
                    padding-bottom: 56.25%;
                    margin-top: 12px;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .video-preview iframe {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }

                .add-section-buttons {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-top: 16px;
                }

                .add-section-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 16px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px dashed var(--admin-border);
                    border-radius: 8px;
                    color: var(--admin-text-secondary);
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 13px;
                }

                .add-section-btn:hover {
                    background: rgba(var(--admin-accent-rgb), 0.1);
                    border-color: var(--admin-accent);
                    color: var(--admin-accent);
                }

                .spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .image-section,
                .video-section,
                .link-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
            `}</style>
        </div>
    );
};

export default BlogEditor;
