import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    User,
    ArrowRight,
    Clock,
    Tag,
    ChevronRight,
    Play,
    ExternalLink,
    Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBlogs, getImageUrl, usePress } from '../hooks/useFirebase';

const Blog = () => {
    const { data: blogs, loading, error } = useBlogs();
    const { data: pressData } = usePress();
    const [filter, setFilter] = useState('all');

    // Default sample blogs for fallback
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

    const blogList = blogs.length > 0 ? blogs : defaultBlogs;

    // Get unique categories
    const categories = ['all', ...new Set(blogList.map(b => b.category || 'General'))];

    // Filter blogs
    const filteredBlogs = filter === 'all'
        ? blogList
        : blogList.filter(b => (b.category || 'General') === filter);

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };



    if (loading) {
        return (
            <div className="app-container blog-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'var(--nav-height)' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={48} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--color-text-secondary)', marginTop: '16px' }}>Loading newsletter...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container blog-page">
            {/* Hero Section */}
            <section className="blog-hero">
                <motion.div
                    className="blog-hero-content"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1>Track <span className="accent">Stories</span></h1>
                    <p>News, insights, and behind-the-scenes from the world of motorsport</p>
                </motion.div>
            </section>

            {/* Filter Tabs */}
            <section className="blog-filters">
                <div className="filter-tabs">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`filter-tab ${filter === cat ? 'active' : ''}`}
                            onClick={() => setFilter(cat)}
                        >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </div>
            </section>

            {/* Blog Grid */}
            <section className="blog-grid-section">
                <div className="blog-grid">
                    {filteredBlogs.map((blog, index) => (
                        <Link to={`/newsletter/${blog.id}`} key={blog.id} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                            <motion.article
                                className="blog-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="blog-card-image">
                                    <img
                                        src={getImageUrl(blog.coverImage, '/blog-placeholder.webp')}
                                        alt={blog.title}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://placehold.co/600x400/1a1a1a/ffffff?text=Blog+Image';
                                        }}
                                    />
                                    {blog.category && (
                                        <span className="blog-category">{blog.category}</span>
                                    )}
                                </div>
                                <div className="blog-card-content">
                                    <div className="blog-meta">
                                        <span className="blog-date">
                                            <Calendar size={14} />
                                            {formatDate(blog.publishedAt)}
                                        </span>
                                        <span className="blog-author">
                                            <User size={14} />
                                            {blog.author}
                                        </span>
                                    </div>
                                    <h3 className="blog-title">{blog.title}</h3>
                                    <p className="blog-excerpt">{blog.excerpt}</p>
                                    <button className="blog-read-more">
                                        Read More <ArrowRight size={16} />
                                    </button>
                                </div>
                            </motion.article>
                        </Link>
                    ))}
                </div>

                {filteredBlogs.length === 0 && (
                    <div className="no-blogs">
                        <p>No newsletters found in this category.</p>
                    </div>
                )}
            </section>

            {/* External Coverage Section */}
            <section className="external-coverage-section">
                <div className="section-header">
                    <h2>Press & <span className="accent">External Coverage</span></h2>
                    <p>Read what others are saying about Trackmeisters across the web.</p>
                </div>
                <div className="external-links-grid">
                    {(pressData.length > 0 ? pressData : [
                        { outlet: 'Motorsport.com', title: 'Trackmeisters: Revolutionizing Track Days in Asia', url: '', date: 'Feb 2026' },
                        { outlet: 'Evo India', title: 'The Rise of Grassroots Racing: A New Era', url: '', date: 'Jan 2026' },
                        { outlet: 'Overdrive', title: 'Start your racing career with Trackmeisters: A Complete Guide', url: '', date: 'Dec 2025' },
                        { outlet: 'AutoCar', title: 'Performance Car of the Year 2025 - Hosted at Trackmeisters', url: '', date: 'Nov 2025' }
                    ]).map((link, index) => {
                        // Safe URL helper
                        const getSafeUrl = (url) => {
                            if (!url || url === '#') return null;
                            if (url.startsWith('http://') || url.startsWith('https://')) return url;
                            return `https://${url}`;
                        };

                        const safeUrl = getSafeUrl(link.url);
                        const Component = safeUrl ? motion.a : motion.div;
                        const props = safeUrl
                            ? { href: safeUrl, target: "_blank", rel: "noopener noreferrer" }
                            : { onClick: (e) => e.preventDefault() };

                        return (
                            <Component
                                {...props}
                                key={link.id || index}
                                className="external-link-card"
                                whileHover={{ y: -5, borderColor: 'var(--color-accent)' }}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                style={{ cursor: safeUrl ? 'pointer' : 'default' }}
                            >
                                <div className="external-link-header">
                                    <span className="external-site">{link.outlet || link.site}</span>
                                    {safeUrl && <ExternalLink size={16} />}
                                </div>
                                <h4 className="external-title">{link.title}</h4>
                                <span className="external-date">{link.date}</span>
                            </Component>
                        );
                    })}
                </div>
            </section>



            <style>{`
                .blog-page {
                    min-height: 100vh;
                    padding-top: var(--nav-height);
                }

                .blog-hero {
                    padding: 80px 24px;
                    text-align: center;
                    background: linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.1) 0%, transparent 50%);
                }

                .blog-hero h1 {
                    font-size: clamp(2.5rem, 6vw, 4rem);
                    font-weight: 700;
                    margin-bottom: 16px;
                }

                .blog-hero h1 .accent {
                    color: var(--color-accent);
                }

                .blog-hero p {
                    color: var(--color-text-secondary);
                    font-size: 1.1rem;
                    max-width: 600px;
                    margin: 0 auto;
                }

                .blog-filters {
                    padding: 0 24px;
                    margin-bottom: 40px;
                }

                .filter-tabs {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                    flex-wrap: wrap;
                }

                .filter-tab {
                    padding: 10px 24px;
                    border-radius: 50px;
                    border: 1px solid var(--color-border);
                    background: transparent;
                    color: var(--color-text-secondary);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }

                .filter-tab:hover,
                .filter-tab.active {
                    background: var(--color-accent);
                    color: white;
                    border-color: var(--color-accent);
                }

                .blog-grid-section {
                    padding: 0 24px 80px;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .blog-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 24px;
                }

                .blog-card {
                    background: var(--color-surface);
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: 1px solid var(--color-border);
                }

                .blog-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
                }

                .blog-card-image {
                    position: relative;
                    height: 180px;
                    overflow: hidden;
                }

                .blog-card-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.5s ease;
                }

                .blog-card:hover .blog-card-image img {
                    transform: scale(1.05);
                }

                .blog-category {
                    position: absolute;
                    top: 12px;
                    left: 12px;
                    background: var(--color-accent);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 50px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .blog-card-content {
                    padding: 20px;
                }

                .blog-meta {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 8px;
                    font-size: 0.8rem;
                    color: var(--color-text-secondary);
                }

                .blog-meta span {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .blog-title {
                    font-size: 1.15rem;
                    font-weight: 600;
                    margin-bottom: 8px;
                    line-height: 1.4;
                }

                .blog-excerpt {
                    color: var(--color-text-secondary);
                    font-size: 0.9rem;
                    line-height: 1.5;
                    margin-bottom: 12px;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .blog-read-more {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--color-accent);
                    font-weight: 600;
                    background: none;
                    border: none;
                    cursor: pointer;
                    transition: gap 0.3s ease;
                }

                .blog-read-more:hover {
                    gap: 12px;
                }

                .no-blogs {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--color-text-secondary);
                }



                .external-coverage-section {
                    padding: 60px 24px 100px;
                    max-width: 1400px;
                    margin: 0 auto;
                    border-top: 1px solid var(--color-border);
                }

                .external-coverage-section .section-header {
                    text-align: center;
                    margin-bottom: 40px;
                }

                .external-coverage-section .section-header h2 {
                    font-size: 2rem;
                    margin-bottom: 10px;
                }

                .external-coverage-section .section-header .accent {
                    color: var(--color-accent);
                }

                .external-coverage-section .section-header p {
                    color: var(--color-text-secondary);
                }

                .external-links-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                }

                .external-link-card {
                    display: block;
                    background: var(--color-surface, #1e1e1e);
                    border: 1px solid var(--color-border, #333);
                    padding: 24px;
                    border-radius: 12px;
                    text-decoration: none;
                    color: inherit;
                    transition: all 0.3s ease;
                }

                .external-link-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    color: var(--color-text-secondary);
                }

                .external-site {
                    text-transform: uppercase;
                    font-size: 0.8rem;
                    letter-spacing: 1px;
                    font-weight: 600;
                    color: var(--color-accent);
                }

                .external-title {
                    font-size: 1.2rem;
                    font-weight: 600;
                    margin-bottom: 15px;
                    line-height: 1.4;
                }

                .external-date {
                    font-size: 0.85rem;
                    color: var(--color-text-secondary);
                }

                @media (max-width: 768px) {
                    .blog-grid {
                        grid-template-columns: 1fr;
                    }
                    .external-links-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default Blog;
