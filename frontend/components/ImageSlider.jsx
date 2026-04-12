"use client";

import React, { useState, useEffect } from "react";

const ImageSlider = ({ images, query }) => {
  const [cols, setCols] = useState(3);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight') setLightboxIdx(i => Math.min(i+1, images.length-1));
      if (e.key === 'ArrowLeft') setLightboxIdx(i => Math.max(i-1, 0));
      if (e.key === 'Escape') setLightboxIdx(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, images.length]);

  const download = async (img) => {
    const a = document.createElement('a');
    a.href = img.url;
    a.download = `lacunex-${query.replace(/\s+/g, '-')}-${Date.now()}.jpg`;
    a.target = '_blank';
    a.click();
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="image-slider" style={{ width: '100%', marginBottom: '1rem' }}>
      <div className="slider-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '10px', background: '#111', borderRadius: '8px', border: '1px solid #333' }}>
        <span style={{ color: '#fff', fontSize: '0.9rem' }}>🖼️ Images for: <strong>{query}</strong></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span className="img-count" style={{ color: '#888', fontSize: '0.8rem' }}>{images.length} results</span>
          <div className="col-switcher" style={{ display: 'flex', gap: '4px' }}>
            <button style={{ background: '#222', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => setCols(2)}>⊞ 2</button>
            <button style={{ background: '#222', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => setCols(3)}>⊟ 3</button>
            <button style={{ background: '#222', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => setCols(4)}>⊠ 4</button>
          </div>
        </div>
      </div>

      <div className="masonry-grid" style={{ columns: cols, gap: '12px' }}>
        {images.map((img, i) => (
          <div key={i} className="img-card" onClick={() => setLightboxIdx(i)} style={{ breakInside: 'avoid', marginBottom: '12px', position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden' }}>
            <img
              src={img.thumb || img.thumbnail}
              alt={img.alt || img.title}
              loading="lazy"
              className="img-thumb"
              style={{ width: '100%', display: 'block', margin: 0 }}
            />
            <div className="img-overlay" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: 'white', padding: '8px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80%' }}>📷 {img.photographer || "Creator"}</span>
              <button 
                onClick={e => { e.stopPropagation(); download(img); }}
                style={{ background: 'transparent', border: 'none', color: ' سفید', cursor: 'pointer', outline: 'none' }}
                title="Download"
              >⬇️</button>
            </div>
          </div>
        ))}
      </div>

      {lightboxIdx !== null && (
        <div className="lightbox" onClick={() => setLightboxIdx(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '90vw', height: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <img src={images[lightboxIdx].url} alt={images[lightboxIdx].alt || images[lightboxIdx].title} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
            <div className="lightbox-info" style={{ marginTop: '20px', color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{images[lightboxIdx].alt || images[lightboxIdx].title}</div>
              <div style={{ color: '#ccc', marginBottom: '12px', fontSize: '0.9rem' }}>
                by {images[lightboxIdx].photographer || "Unknown"}
                <span className="source-badge" style={{ marginLeft: '10px', background: '#333', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>{images[lightboxIdx].source}</span>
              </div>
              <button 
                 style={{ background: '#00e5ff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}
                 onClick={() => download(images[lightboxIdx])}>
                ⬇️ Download Full Quality
              </button>
            </div>
            
            {/* Controls */}
            <button className="lb-btn prev" style={{ position: 'absolute', left: 0, top: '45%', background: 'none', border: 'none', color: '#fff', fontSize: '3rem', cursor: 'pointer', padding: '20px' }}
              onClick={() => setLightboxIdx(i => Math.max(i-1,0))}>‹</button>
            <button className="lb-btn next" style={{ position: 'absolute', right: 0, top: '45%', background: 'none', border: 'none', color: '#fff', fontSize: '3rem', cursor: 'pointer', padding: '20px' }}
              onClick={() => setLightboxIdx(i => Math.min(i+1,images.length-1))}>›</button>
            <button className="lb-close" style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer' }} onClick={() => setLightboxIdx(null)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageSlider;
