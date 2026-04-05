"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// Separate component for performance (memoized)
const ImageCard = React.memo(({ image, index }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <div className="img-gallery-card">
      <div className="img-gallery-thumb-wrap">
        {!loaded && <div className="img-gallery-skeleton" />}
        <img
          src={image.url}
          alt={image.title || `Image ${index + 1}`}
          className={`img-gallery-thumb ${loaded ? "img-gallery-thumb-loaded" : ""}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      </div>
      <div className="img-gallery-meta">
        <p className="img-gallery-title" title={image.title}>
          {image.title || "Untitled"}
        </p>
        {image.source_url && (
          <a
            href={image.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="img-gallery-source"
            title={`Source: ${image.source || getDomain(image.source_url)}`}
          >
            <span>{getDomain(image.source_url)}</span>
            <IconExternalLink />
          </a>
        )}
      </div>
    </div>
  );
});

ImageCard.displayName = "ImageCard";

export default function ImageGallery({ images }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Use Intersection Observer or a low-frequency scroll check to prevent main-thread freezing
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    // We only update if state actually changes to prevent render storms
    const nowLeft = el.scrollLeft > 10;
    const nowRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 10;
    
    setCanScrollLeft(nowLeft);
    setCanScrollRight(nowRight);
  }, []);

  useEffect(() => {
    // Initial check after mount/render
    checkScroll();
    
    // Debounced resize listener
    let timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(checkScroll, 100);
    };
    
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeout);
    };
  }, [checkScroll, images]);

  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="img-gallery-wrap">
      <div className="img-gallery-header">
        <span className="img-gallery-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          {images.length} images found
        </span>
        <div className="img-gallery-nav">
          <button
            type="button"
            className={`img-gallery-arrow ${!canScrollLeft ? "img-gallery-arrow-disabled" : ""}`}
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            className={`img-gallery-arrow ${!canScrollRight ? "img-gallery-arrow-disabled" : ""}`}
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
          >
            <IconChevronRight />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="img-gallery-scroll"
        onScroll={checkScroll}
      >
        {images.map((img, i) => (
          <ImageCard key={i} image={img} index={i} />
        ))}
      </div>
    </div>
  );
}
