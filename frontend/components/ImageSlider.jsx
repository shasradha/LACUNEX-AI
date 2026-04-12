"use client";

import React, { useState, useEffect, useCallback } from "react";

function IconClose() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export default function ImageSlider({ images }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const nextImage = useCallback((e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback((e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, closeLightbox, nextImage, prevImage]);

  const downloadImage = (e, url, title) => {
    e.stopPropagation();
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="image-slider-container">
      <div className="masonry-grid">
        {images.map((img, i) => (
          <div key={i} className="masonry-item" onClick={() => openLightbox(i)}>
            <img src={img.thumbnail} alt={img.title} loading="lazy" />
            <div className="masonry-overlay">
              <span className="masonry-title">{img.title}</span>
            </div>
          </div>
        ))}
      </div>

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox} aria-label="Close lightbox">
            <IconClose />
          </button>
          
          <div className="lightbox-nav lightbox-prev" onClick={(e) => prevImage(e)}>
            <IconChevronLeft />
          </div>

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={images[currentIndex].url} 
              alt={images[currentIndex].title} 
              className="lightbox-image" 
            />
            <div className="lightbox-toolbar">
              <div className="lightbox-toolbar-info">
                <h4>{images[currentIndex].title}</h4>
                <a href={images[currentIndex].source_url} target="_blank" rel="noreferrer" className="lightbox-source-link">
                  Source: {images[currentIndex].source}
                </a>
              </div>
              <button 
                className="lightbox-btn" 
                onClick={(e) => downloadImage(e, images[currentIndex].url, images[currentIndex].title)}
                title="Download image"
              >
                <IconDownload />
              </button>
            </div>
          </div>

          <div className="lightbox-nav lightbox-next" onClick={(e) => nextImage(e)}>
            <IconChevronRight />
          </div>
          
          <div className="lightbox-counter">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
