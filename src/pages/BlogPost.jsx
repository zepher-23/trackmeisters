import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    User,
    Clock,
    Share2,
    ChevronRight,
    ExternalLink,
    Loader2
} from 'lucide-react';
import { useBlogs, getImageUrl } from '../hooks/useFirebase';

const BlogPost = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: dbBlogs, loading } = useBlogs();
    const [blog, setBlog] = useState(null);
    const [relatedBlogs, setRelatedBlogs] = useState([]);
    const [activeSection, setActiveSection] = useState('intro');

    // Generate TOC based on content
    const tocItems = React.useMemo(() => {
        if (!blog) return [];
        const items = [{ id: 'intro', label: 'Introduction' }];

        blog.sections?.forEach((section, index) => {
            if (section.type === 'text' && section.content) {
                // Use DOMParser to correctly strip tags and decode entities (like &nbsp;)
                const doc = new DOMParser().parseFromString(section.content, 'text/html');
                const plainText = doc.body.textContent || '';

                if (plainText.trim().length > 0) {
                    // Get first 5 words
                    const words = plainText.trim().split(/\s+/);
                    const label = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
                    items.push({ id: `sec-${index}`, label });
                }
            } else if (section.type === 'video' && section.title) {
                items.push({ id: `sec-${index}`, label: section.title });
            }
        });
        return items;
    }, [blog]);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 100; // Offset for sticky header/sidebar
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setActiveSection(id);
        }
    };

    // Scroll spy effect
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + 150;

            // Check headers manually since IntersectionObserver can be tricky with short content
            for (let i = tocItems.length - 1; i >= 0; i--) {
                const item = tocItems[i];
                const element = document.getElementById(item.id);
                if (element && element.offsetTop <= scrollPosition) {
                    setActiveSection(item.id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [tocItems]);

    // Default sample blogs for fallback (matching Blog.jsx)
    const defaultBlogs = [
        {
            id: '1',
            title: 'Season 2026 Preview: What to Expect',
            author: 'Alex Morgan',
            publishedAt: '2026-01-15',
            coverImage: '/event-track-day.webp',
            excerpt: 'Get ready for an exciting season with new tracks, upgraded machinery, and fierce competition.',
            category: 'News',
            sections: [
                { type: 'text', content: 'The 2026 season promises to be our most exciting year yet. With three new tracks joining the calendar and significant regulation changes, drivers will need to adapt quickly to stay competitive.' },
                { type: 'image', url: '/event-race.webp', caption: 'The new Silverstone configuration' },
                { type: 'text', content: 'Our team has been working tirelessly during the off-season to prepare for the challenges ahead. New partnerships and technical developments will give us an edge on the competition.' }
            ]
        },
        {
            id: '2',
            title: 'Behind the Scenes: Car Preparation',
            author: 'Sarah Jenkins',
            publishedAt: '2026-01-10',
            coverImage: '/event-meetup.webp',
            excerpt: 'A deep dive into how our engineering team prepares each vehicle for race day.',
            category: 'Technical',
            sections: [
                { type: 'text', content: 'Every race car that hits the track represents hundreds of hours of meticulous preparation. From engine tuning to aerodynamic adjustments, nothing is left to chance.' }
            ]
        },
        {
            id: '3',
            title: 'Driver Interview: Viktor Rossi',
            author: 'Track Media',
            publishedAt: '2026-01-05',
            coverImage: '/drivers/driver3.webp',
            excerpt: 'We sit down with the legendary Viktor Rossi to discuss his career and the future of classic racing.',
            category: 'Interview',
            sections: [
                { type: 'text', content: 'Viktor Rossi has been racing for over three decades. His insights on the evolution of motorsport are invaluable to any enthusiast.' },
                { type: 'video', youtubeId: 'dQw4w9WgXcQ', title: 'Full Interview' }
            ]
        }
    ];

    useEffect(() => {
        const allBlogs = dbBlogs.length > 0 ? dbBlogs : defaultBlogs;

        if (!loading) {
            const found = allBlogs.find(b => b.id === id);
            if (found) {
                setBlog(found);
                // Filter related blogs (same category or just others)
                const others = allBlogs.filter(b => b.id !== id);
                setRelatedBlogs(others.slice(0, 4));
            }
        }
    }, [id, dbBlogs, loading]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const renderSection = (section, index) => {
        const sectionId = `sec-${index}`;
        switch (section.type) {
            case 'text':
                // Check if this text block is effectively a header
                return (
                    <React.Fragment key={index}>
                        {section.content && (
                            <div
                                id={sectionId}
                                className="post-text"
                                style={{}}
                                dangerouslySetInnerHTML={{ __html: section.content }}
                            />
                        )}
                    </React.Fragment>
                );
            case 'image':
                if (!section.url) return null;
                return (
                    <figure key={index} id={sectionId} className="post-figure">
                        <img src={getImageUrl(section.url)} alt={section.caption || 'Newsletter image'} />
                        {section.caption && <figcaption>{section.caption}</figcaption>}
                    </figure>
                );
            case 'video':
                return (
                    <div key={index} id={sectionId} className="post-video">
                        <div className="video-wrapper">
                            <iframe
                                src={`https://www.youtube.com/embed/${section.youtubeId}`}
                                title={section.title || 'Video'}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                        {section.title && <p className="video-title">{section.title}</p>}
                    </div>
                );
            case 'link':
                return (
                    <a key={index} id={sectionId} href={section.url} target="_blank" rel="noopener noreferrer" className="post-link">
                        <ExternalLink size={16} />
                        {section.text || section.url}
                    </a>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="app-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={48} className="animate-spin text-accent" />
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="app-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
                <h2>Blog Post Not Found</h2>
                <Link to="/newsletter" className="admin-btn admin-btn-primary">Return to Newsletter</Link>
            </div>
        );
    }

    return (
        <div className="app-container blog-post-page">
            <div className="blog-layout">
                {/* Left Sidebar: Table of Contents */}
                <aside className="blog-sidebar left-sidebar">
                    <div className="sticky-content">
                        <Link to="/newsletter" className="back-link">
                            <ArrowLeft size={16} /> Back
                        </Link>

                        <div className="toc-container">
                            <h3 className="sidebar-title">Contents</h3>
                            <ul className="toc-list">
                                {tocItems.map((item) => (
                                    <li
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={activeSection === item.id ? 'active' : ''}
                                    >
                                        {item.label}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="share-section">
                            <h4 className="sidebar-subtitle">Share</h4>
                            <div className="share-buttons">
                                <button className="share-btn">Twitter</button>
                                <button className="share-btn">Facebook</button>
                                <button className="share-btn">LinkedIn</button>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Center: Main Content */}
                <main className="blog-main">
                    <article className="post-content">
                        <header className="post-header" id="intro">
                            <h1 className="post-title">{blog.title}</h1>
                            <div className="post-meta">
                                <span className="post-category">{blog.category}</span>
                                <span className="meta-item">
                                    <Calendar size={16} /> {formatDate(blog.publishedAt)}
                                </span>
                                <span className="meta-item">
                                    <User size={16} /> {blog.author}
                                </span>
                                <span className="meta-item">
                                    <Clock size={16} /> 5 min read
                                </span>
                            </div>
                        </header>

                        {blog.coverImage && (
                            <div className="post-hero">
                                <img src={getImageUrl(blog.coverImage, '/blog-placeholder.png')} alt={blog.title} />
                            </div>
                        )}

                        <div className="post-body-text">
                            {blog.sections?.map((section, index) => renderSection(section, index))}
                        </div>
                    </article>
                </main>

                {/* Right Sidebar: Other Blogs */}
                <aside className="blog-sidebar right-sidebar">
                    <div className="sticky-content">
                        <h3 className="sidebar-title">More Stories</h3>
                        <div className="related-list">
                            {relatedBlogs.map(rb => (
                                <Link to={`/newsletter/${rb.id}`} key={rb.id} className="related-card">
                                    <div className="related-image">
                                        <img src={getImageUrl(rb.coverImage, '/blog-placeholder.png')} alt={rb.title} />
                                    </div>
                                    <div className="related-info">
                                        <span className="related-category">{rb.category}</span>
                                        <h4>{rb.title}</h4>
                                        <span className="related-date">{formatDate(rb.publishedAt)}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>

            <style>{`
                .blog-post-page {
                    padding-top: var(--nav-height);
                    min-height: 100vh;
                    background: var(--color-bg);
                }

                .blog-layout {
                    display: grid;
                    grid-template-columns: 200px 1fr 280px;
                    gap: 30px;
                    max-width: 1600px;
                    margin: 0 auto;
                    padding: 40px 24px 80px;
                    align-items: start;
                }

                /* Sidebars */
                .blog-sidebar {
                    height: 100%;
                }

                .sticky-content {
                    position: sticky;
                    top: calc(var(--nav-height) + 40px);
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                }

                .sidebar-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: 16px;
                    border-bottom: 2px solid var(--color-accent);
                    padding-bottom: 8px;
                    display: inline-block;
                }

                .sidebar-subtitle {
                    font-size: 0.9rem;
                    color: var(--color-text-secondary);
                    margin-bottom: 12px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                /* Left Sidebar Specifics */
                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--color-text-secondary);
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 0.9rem;
                    transition: color 0.3s ease;
                }

                .back-link:hover {
                    color: var(--color-accent);
                }

                .toc-list {
                    list-style: none;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    border-left: 1px solid var(--color-border);
                }

                .toc-list li {
                    padding-left: 20px;
                    position: relative;
                    color: var(--color-text-secondary);
                    cursor: pointer;
                    font-size: 0.95rem;
                    transition: color 0.3s ease;
                }

                .toc-list li::before {
                    content: '';
                    position: absolute;
                    left: -1px;
                    top: 0;
                    height: 100%;
                    width: 2px;
                    background: transparent;
                    transition: background 0.3s ease;
                }

                .toc-list li.active,
                .toc-list li:hover {
                    color: var(--color-text);
                    font-weight: 500;
                }

                .toc-list li.active::before {
                    background: var(--color-accent);
                }

                .share-buttons {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .share-btn {
                    padding: 6px 12px;
                    border: 1px solid var(--color-border);
                    background: transparent;
                    color: var(--color-text-secondary);
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s ease;
                }

                .share-btn:hover {
                    border-color: var(--color-text);
                    color: var(--color-text);
                }

                /* Main Content */
                .blog-main {
                    background: transparent;
                    padding: 0;
                    border: none;
                }

                .post-header {
                    margin-bottom: 24px;
                    text-align: left;
                    border-bottom: 1px solid var(--color-border);
                    padding-bottom: 24px;
                }

                .post-category {
                    display: inline-flex;
                    align-items: center;
                    background: var(--color-accent);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 50px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .post-title {
                    font-size: clamp(2rem, 4vw, 3rem);
                    font-weight: 800;
                    line-height: 1.2;
                    margin-bottom: 24px;
                }

                .post-meta {
                    display: flex;
                    justify-content: flex-start;
                    align-items: center;
                    gap: 20px;
                    color: var(--color-text-secondary);
                    font-size: 0.9rem;
                    flex-wrap: wrap;
                }

                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .post-hero {
                    width: 100%;
                    height: 500px;
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 30px;
                }

                .post-hero img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .post-body-text {
                    font-size: 1.1rem;
                    line-height: 1.6;
                    color: var(--color-text-primary);
                }

                .post-text {
                    margin-bottom: 16px;
                }

                .post-section-title {
                    margin-top: 32px;
                    margin-bottom: 16px;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--color-text);
                    line-height: 1.3;
                }

                .post-figure {
                    margin: 40px 0;
                }

                .post-figure img {
                    width: 100%;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }

                .post-figure figcaption {
                    text-align: center;
                    color: var(--color-text-muted);
                    font-style: italic;
                    margin-top: 12px;
                    font-size: 0.9rem;
                }

                .post-video {
                    margin: 40px 0;
                }

                .video-wrapper {
                    position: relative;
                    padding-bottom: 56.25%;
                    height: 0;
                    border-radius: 12px;
                    overflow: hidden;
                    background: #000;
                }

                .video-wrapper iframe {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }

                .video-title {
                    text-align: center;
                    color: var(--color-text-secondary);
                    margin-top: 12px;
                }

                /* Right Sidebar - Related */
                .related-list {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .related-card {
                    display: flex;
                    gap: 16px;
                    text-decoration: none;
                    color: inherit;
                    group;
                    transition: transform 0.2s ease;
                }

                .related-card:hover {
                    transform: translateX(4px);
                }

                .related-image {
                    width: 80px;
                    height: 80px;
                    flex-shrink: 0;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .related-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .related-info {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }

                .related-category {
                    font-size: 0.7rem;
                    color: var(--color-accent);
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }

                /* Highlighted Link Styles */
                .post-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--color-accent);
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 1.05rem;
                    margin: 16px 0;
                    padding-bottom: 2px;
                    border-bottom: 1px dashed var(--color-accent);
                    transition: all 0.2s ease;
                }

                .post-link:hover {
                    color: var(--color-text);
                    border-bottom-style: solid;
                }

                .post-text a {
                    color: var(--color-accent);
                    text-decoration: underline;
                    text-underline-offset: 3px;
                    font-weight: 500;
                    transition: color 0.2s ease;
                }

                .post-text a:hover {
                    color: var(--color-text);
                    text-decoration: none;
                }

                .related-info h4 {
                    font-size: 0.95rem;
                    font-weight: 600;
                    line-height: 1.4;
                    margin-bottom: 6px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .related-date {
                    font-size: 0.8rem;
                    color: var(--color-text-muted);
                }

                /* Responsive */
                @media (max-width: 1200px) {
                    .blog-layout {
                        grid-template-columns: 200px 1fr;
                    }
                    .right-sidebar {
                        display: none; /* Hide right sidebar on medium screens or move below? */
                    }
                }

                @media (max-width: 1024px) {
                    .blog-layout {
                        grid-template-columns: 1fr;
                        padding: 40px 20px;
                    }

                    .blog-sidebar {
                        display: none; /* Mobile layout simplified */
                    }

                    .left-sidebar, .right-sidebar {
                        display: none;
                    }
                    
                    /* Maybe show related at bottom for mobile? */
                }
            `}</style>
        </div>
    );
};

export default BlogPost;
