'use client';

import React, { useEffect, useRef } from 'react';

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export default function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: TrailParticle[] = [];
    let animationFrameId: number;
    let mouse = { x: -100, y: -100 };
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    // Cyber/Tech colors for the sparks
    const getColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      // Bright cyan, indigo, and emerald for dark mode. Deeper blues for light mode.
      return isDark 
        ? ['#22d3ee', '#818cf8', '#34d399'] 
        : ['#0284c7', '#4f46e5', '#059669'];
    };

    const addParticle = (x: number, y: number) => {
      const colors = getColors();
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 2.5 + 0.5, // Slight downward drift like falling digital dust
        life: 1,
        maxLife: Math.random() * 40 + 20, // Frames alive
        size: Math.random() * 4 + 1.5,
        color
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Render particles
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1 / p.maxLife;

        // Apply a bit of friction and wobble
        p.vx *= 0.95;
        p.vy *= 0.95;

        if (p.life <= 0) {
          particles.splice(i, 1);
          i--;
          continue;
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        
        // Draw squares instead of circles for a "data/pixel/tech" feel
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      
      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    
    let lastTime = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const currentTime = performance.now();
      
      // Interpolate if the mouse moved too fast (to avoid gaps in the trail)
      const dx = e.clientX - mouse.x;
      const dy = e.clientY - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If we have a previous position and we moved a bit, interpolate sparks
      if (mouse.x !== -100 && distance > 5 && (currentTime - lastTime) < 50) {
          const steps = Math.min(Math.floor(distance / 5), 20); // Cap steps to prevent lag
          for (let i = 0; i < steps; i++) {
              addParticle(mouse.x + (dx * i) / steps, mouse.y + (dy * i) / steps);
          }
      }
      
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      lastTime = currentTime;
      
      // Always add at least one particle at the exact mouse pos
      addParticle(mouse.x, mouse.y);
      addParticle(mouse.x, mouse.y);
    };
    
    window.addEventListener('mousemove', handleMouseMove);

    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9998]"
      style={{ display: 'block' }}
    />
  );
}
