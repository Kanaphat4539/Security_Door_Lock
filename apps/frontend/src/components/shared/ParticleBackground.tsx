'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseX: number;
  baseY: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let mouse = { x: -1000, y: -1000 }; // start off-screen
    const MOUSE_RADIUS = 150; // The force field radius
    
    // Check theme to decide particle color
    const getParticleColor = (alpha: number) => {
      const isDark = document.documentElement.classList.contains('dark');
      // Light mode: dark blue/slate, Dark mode: glowing cyan/blue
      return isDark 
        ? `rgba(56, 189, 248, ${alpha})` // Tailwind sky-400
        : `rgba(71, 85, 105, ${alpha})`; // Tailwind slate-600
    };

    const getLineColor = (alpha: number) => {
      const isDark = document.documentElement.classList.contains('dark');
      return isDark 
        ? `rgba(56, 189, 248, ${alpha * 0.5})` 
        : `rgba(71, 85, 105, ${alpha * 0.5})`;
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 12000); // Dynamic density
      
      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 1.5 + 0.5,
          baseX: x,
          baseY: y
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const particleColor = getParticleColor(0.8);
      
      for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        
        // Update positions based on velocity
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Mouse interaction (Physics repulsive force)
        let dx = mouse.x - p.x;
        let dy = mouse.y - p.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < MOUSE_RADIUS) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          
          // The closer the mouse, the stronger the push
          const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
          const pushX = forceDirectionX * force * 4;
          const pushY = forceDirectionY * force * 4;
          
          p.x -= pushX;
          p.y -= pushY;
        } else {
          // Slow return to base velocity if deflected heavily? 
          // (For simplicity, we let them drift off and bounce)
        }

        // Draw Particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();

        // Connect particles with lines
        for (let j = i; j < particles.length; j++) {
          let p2 = particles[j];
          let dx2 = p.x - p2.x;
          let dy2 = p.y - p2.y;
          let distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (distance2 < 140) {
            ctx.beginPath();
            ctx.strokeStyle = getLineColor(1 - distance2 / 140);
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    // Event Listeners
    window.addEventListener('resize', resize);
    
    // We attach mousemove to window so it tracks over the whole screen
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    // Handle case when mouse leaves the window
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
