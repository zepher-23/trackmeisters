import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Calendar, Gauge, Settings, Tag, MessageCircle, MapPin, Share2 } from 'lucide-react';
import { fetchDocument, COLLECTIONS } from '../lib/firebase';
import Loader from '../components/Loader';

const formatPrice = (priceStr) => {
    if (!priceStr) return 'Contact for Price';
    // Remove existing commas and symbols
    let numStr = priceStr.toString().replace(/[^0-9]/g, '');
    if (!numStr) return priceStr; // Fallback
    
    // Format according to Indian numbering system
    let lastThree = numStr.substring(numStr.length - 3);
    let otherNumbers = numStr.substring(0, numStr.length - 3);
    if (otherNumbers != '') {
        lastThree = ',' + lastThree;
    }
    return '₹' + otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
};

const WhatsAppIcon = ({ size = 24, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
);

const ClassifiedListing = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const loadListing = async () => {
            try {
                const data = await fetchDocument(COLLECTIONS.CLASSIFIEDS, id);
                if (data) {
                    setListing(data);
                } else {
                    // Navigate back if not found
                    navigate('/classifieds');
                }
            } catch (err) {
                console.error("Error loading listing:", err);
                navigate('/classifieds');
            } finally {
                setLoading(false);
            }
        };
        loadListing();
    }, [id, navigate]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', paddingTop: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
                <Loader />
            </div>
        );
    }

    if (!listing) return null;

    const allImages = listing.images?.length > 0 ? listing.images : (listing.featuredImage ? [listing.featuredImage] : []);
    
    const handleWhatsApp = () => {
        // Use seller phone if available, else a fallback
        const phone = listing.contactPhone || "919019741542"; // Add country code if missing
        // Strip non-digits
        const cleanPhone = phone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('91') ? cleanPhone : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);
        
        const message = `Hi, I am interested in your listing on Trackmeisters Classifieds: ${listing.title} (ID: ${listing.listingId || id}). Is it still available?`;
        window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const isProduct = listing.type === 'product' || listing.category === 'product';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: '80px', color: 'var(--color-text-primary)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                
                {/* Header Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <button 
                        onClick={() => navigate('/classifieds')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--color-border)',
                            color: 'white', padding: '8px 16px',
                            borderRadius: '8px', cursor: 'pointer',
                            fontSize: '14px', fontWeight: '600'
                        }}
                    >
                        <ChevronLeft size={16} /> Back to Classifieds
                    </button>
                    
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied to clipboard!");
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-accent)', padding: '8px',
                            cursor: 'pointer',
                            fontSize: '14px', fontWeight: '600'
                        }}
                    >
                        <Share2 size={16} /> Share
                    </button>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '40px',
                    alignItems: 'start'
                }}>
                    
                    {/* Left: Image Gallery */}
                    <div style={{
                        position: 'sticky',
                        top: '100px'
                    }}>
                        {allImages.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Main Image */}
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        width: '100%',
                                        aspectRatio: '4/3',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        background: '#111',
                                        border: '1px solid var(--color-border)'
                                    }}
                                >
                                    <img 
                                        src={allImages[currentImageIndex]} 
                                        alt={listing.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </motion.div>
                                
                                {/* Thumbnails */}
                                {allImages.length > 1 && (
                                    <div style={{ 
                                        display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px',
                                        scrollbarWidth: 'thin'
                                    }}>
                                        {allImages.map((img, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => setCurrentImageIndex(idx)}
                                                style={{
                                                    width: '80px',
                                                    height: '60px',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    border: currentImageIndex === idx ? '2px solid var(--color-accent)' : '2px solid transparent',
                                                    opacity: currentImageIndex === idx ? 1 : 0.6,
                                                    transition: 'all 0.2s ease',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <img src={img} alt={`Thumbnail ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{
                                width: '100%',
                                aspectRatio: '4/3',
                                borderRadius: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px dashed var(--color-border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--color-text-secondary)'
                            }}>
                                No images available
                            </div>
                        )}
                    </div>

                    {/* Right: Details */}
                    <div>
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                <span style={{
                                    padding: '4px 12px', background: 'rgba(255, 42, 42, 0.1)', color: 'var(--color-accent)',
                                    borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase'
                                }}>
                                    {isProduct ? 'Performance Part' : 'Vehicle'}
                                </span>
                                {listing.status === 'sold' && (
                                    <span style={{
                                        padding: '4px 12px', 
                                        background: 'rgba(59, 130, 246, 0.1)', 
                                        color: '#3b82f6',
                                        borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase'
                                    }}>
                                        Sold
                                    </span>
                                )}
                            </div>
                            
                            <h1 style={{ fontSize: '36px', fontWeight: '800', lineHeight: 1.2, marginBottom: '12px' }}>
                                {listing.title}
                            </h1>
                            
                            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-accent)' }}>
                                {formatPrice(listing.price)}
                            </div>
                        </div>

                        {/* Specs Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '16px',
                            marginBottom: '32px'
                        }}>
                            {!isProduct ? (
                                <>
                                    {listing.year && <SpecItem icon={<Calendar size={18} />} label="Year" value={listing.year} />}
                                    {listing.mileage && <SpecItem icon={<Gauge size={18} />} label="Mileage" value={`${listing.mileage} km`} />}
                                    {listing.trackDistance && <SpecItem icon={<Gauge size={18} />} label="Track Use" value={`${listing.trackDistance} km`} />}
                                    {listing.transmission && <SpecItem icon={<Settings size={18} />} label="Transmission" value={listing.transmission} />}
                                    {listing.engine && <SpecItem icon={<Settings size={18} />} label="Engine" value={listing.engine} />}
                                    {listing.buildType && <SpecItem icon={<Tag size={18} />} label="Build Type" value={listing.buildType} />}
                                </>
                            ) : (
                                <>
                                    {listing.make && <SpecItem icon={<Tag size={18} />} label="Brand" value={listing.make} />}
                                    {listing.model && <SpecItem icon={<Settings size={18} />} label="Model/Fitment" value={listing.model} />}
                                    {listing.year && <SpecItem icon={<Calendar size={18} />} label="Year Bought" value={listing.year} />}
                                    {listing.mileage && <SpecItem icon={<Gauge size={18} />} label="Usage" value={listing.mileage} />}
                                </>
                            )}
                        </div>

                        {/* Description */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '16px',
                            padding: '24px',
                            marginBottom: '32px'
                        }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'white' }}>Description</h3>
                            <div style={{
                                color: 'var(--color-text-secondary)',
                                lineHeight: '1.8',
                                whiteSpace: 'pre-wrap',
                                fontSize: '15px'
                            }}>
                                {listing.description || 'No description provided.'}
                            </div>
                        </div>



                        {/* CTA WhatsApp Button */}
                        {listing.status === 'sold' ? (
                            <div style={{
                                width: '100%',
                                padding: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '12px',
                                fontSize: '18px',
                                fontWeight: '800',
                                textAlign: 'center',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Item Sold
                            </div>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleWhatsApp}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '18px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    boxShadow: '0 8px 24px rgba(37, 211, 102, 0.3)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                <WhatsAppIcon size={26} />
                                Enquire on WhatsApp
                            </motion.button>
                        )}
                        
                        {listing.listingId && (
                            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '16px' }}>
                                Listing ID: {listing.listingId}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Responsive Styles */}
            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 768px) {
                    div[style*="grid-template-columns: 1fr 1fr"] {
                        grid-template-columns: 1fr !important;
                    }
                    div[style*="position: sticky"] {
                        position: relative !important;
                        top: 0 !important;
                    }
                }
            `}} />
        </div>
    );
};

const SpecItem = ({ icon, label, value }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)'
    }}>
        <div style={{ color: 'var(--color-accent)' }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{value}</div>
        </div>
    </div>
);

export default ClassifiedListing;
