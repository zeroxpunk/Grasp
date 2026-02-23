"use client";

import { useEffect, useCallback } from "react";

interface ImageLightboxProps {
  images: { src: string; alt: string }[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}

export function ImageLightbox({ images, index, onClose, onChange }: ImageLightboxProps) {
  const hasMultiple = images.length > 1;

  const goPrev = useCallback(() => {
    onChange((index - 1 + images.length) % images.length);
  }, [index, images.length, onChange]);

  const goNext = useCallback(() => {
    onChange((index + 1) % images.length);
  }, [index, images.length, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasMultiple) goPrev();
      if (e.key === "ArrowRight" && hasMultiple) goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext, hasMultiple]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const image = images[index];
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 animate-[fade-in_150ms_ease-out]"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors p-2"
        aria-label="Close"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Previous */}
      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors p-2"
          aria-label="Previous image"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <img
        src={image.src}
        alt={image.alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg bg-white p-2"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors p-2"
          aria-label="Next image"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Counter */}
      {hasMultiple && (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-zinc-500">
          {index + 1} / {images.length}
        </span>
      )}
    </div>
  );
}
