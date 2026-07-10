'use client';

import React, { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  
  // Use refs to avoid re-renders during animation
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  
  useEffect(() => {
    let animationFrameId: number;
    let isVisible = false;
    
    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) {
        if (ringRef.current) ringRef.current.style.opacity = '1';
        if (dotRef.current) dotRef.current.style.opacity = '1';
        isVisible = true;
      }
    };

    const onMouseLeave = () => {
      if (ringRef.current) ringRef.current.style.opacity = '0';
      if (dotRef.current) dotRef.current.style.opacity = '0';
      isVisible = false;
    };
    
    // Add hover effect for clickable elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isClickable = target.closest('a, button, [role="button"], input, select, textarea, .cursor-pointer');
      if (dotRef.current) {
        if (isClickable) {
          dotRef.current.style.color = '#f59e0b'; // Amber-500
          dotRef.current.style.transform = 'scale(1.1)';
        } else {
          dotRef.current.style.color = '#0ea5e9'; // Sky-500
          dotRef.current.style.transform = 'scale(1)';
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseover', handleMouseOver);
    
    const render = () => {
      // Direct positioning for the arrow (zero delay)
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }

      // Linear interpolation (lerp) for smooth trailing effect on the ring
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.2;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.2;
      
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }
      
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Completely hide the default cursor for all elements */
        * {
          cursor: none !important;
        }
      `}} />
      
      {/* The Arrow (Zero Delay) */}
      <div 
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[10000] opacity-0 transition-opacity duration-300 ease-in-out text-sky-500 origin-top-left drop-shadow-[0_0_8px_rgba(14,165,233,0.8)]"
        style={{ willChange: 'transform, opacity, color', transformOrigin: 'top left' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" style={{ transform: 'translate(-2px, -2px)' }}>
          <path fill="currentColor" stroke="#ffffff" strokeWidth="1.5" d="M5 3l14 9-6 2-3 7z" />
        </svg>
      </div>

      {/* The Trailing Ring (Lerped) */}
      <div 
        ref={ringRef}
        className="fixed top-0 left-0 w-8 h-8 -ml-4 -mt-4 border-[1.5px] border-cyan-400 dark:border-cyan-300 rounded-full pointer-events-none z-[9999] opacity-0 transition-opacity duration-300 ease-in-out shadow-[0_0_15px_rgba(34,211,238,0.5)]"
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="absolute inset-0 bg-cyan-400/10 rounded-full blur-sm"></div>
      </div>
    </>
  );
}
