'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface SnapshotViewerProps {
  src: string;
}

export function SnapshotViewer({ src }: SnapshotViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;
    
    const fetchImage = async () => {
      setLoading(true);
      setError(false);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(src, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Failed to fetch image');
        
        const blob = await res.blob();
        if (isMounted) {
          objectUrl = URL.createObjectURL(blob);
          setImgSrc(objectUrl);
        }
      } catch (err) {
        console.error('Error fetching image:', err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    if (src) {
      fetchImage();
    }
    
    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const modalContent = isOpen ? (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
      style={{ margin: 0, padding: 0 }}
    >
      <div 
        className="relative flex flex-col items-center justify-center max-w-6xl w-full" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute -top-14 right-0 text-white hover:text-red-400 bg-white/10 hover:bg-white/30 rounded-full p-2.5 transition-all shadow-lg backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          title="Close (Esc)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
        {loading && (
          <div className="flex flex-col items-center justify-center space-y-4 text-white min-h-[400px]">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
            <p className="font-semibold tracking-wide animate-pulse text-lg">Loading snapshot...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="flex items-center justify-center bg-slate-800/80 text-red-400 font-medium text-lg rounded-2xl min-h-[400px] w-full max-w-lg ring-1 ring-red-500/30 shadow-2xl backdrop-blur-md">
            Failed to load snapshot.
          </div>
        )}
        
        {imgSrc && !loading && (
          <img 
            src={imgSrc} 
            alt="Access Snapshot" 
            className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl ring-2 ring-white/20 animate-in zoom-in-95 duration-300" 
          />
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div 
        className="w-16 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 hover:shadow-md transition-all group relative"
        onClick={() => setIsOpen(true)}
      >
        {loading && !imgSrc && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {error && !imgSrc && (
          <div className="w-full h-full flex items-center justify-center text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
        )}
        {imgSrc && (
          <>
            <img 
              src={imgSrc} 
              alt="Thumbnail" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"><path d="M15 3h6v6"></path><path d="M9 21H3v-6"></path><path d="M21 3l-7 7"></path><path d="M3 21l7-7"></path></svg>
            </div>
          </>
        )}
      </div>
      
      {mounted && isOpen && createPortal(modalContent, document.body)}
    </>
  );
}
