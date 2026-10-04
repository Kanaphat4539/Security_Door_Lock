'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  Video,
  VideoOff,
} from 'lucide-react';

interface CctvMonitorProps {
  cameraTitle?: string;
  locationName?: string;
  className?: string;
}

export function CctvMonitor({
  cameraTitle = 'CCTV 01 · MAIN ENTRANCE',
  locationName = 'SECURE LAB DOOR',
  className = 'w-full max-w-5xl mx-auto',
}: CctvMonitorProps) {
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [, setIsStreamLoading] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const cctvContainerRef = useRef<HTMLDivElement>(null);

  // Live real-time clock for CCTV display
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8)
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load saved camera stream URL from localStorage or environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('cctv_stream_url') ||
        process.env.NEXT_PUBLIC_CAMERA_STREAM_URL ||
        '';
      setStreamUrl(saved);
      setInputUrl(saved);
    }
  }, []);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!cctvContainerRef.current) return;
    if (!document.fullscreenElement) {
      void cctvContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleSaveStream = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputUrl.trim();
    setStreamUrl(trimmed);
    setStreamError(false);
    setIsStreamLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cctv_stream_url', trimmed);
    }
    setShowConfig(false);
  };

  const refreshFeed = () => {
    setStreamError(false);
    setIsStreamLoading(true);
    const current = streamUrl;
    setStreamUrl('');
    setTimeout(() => setStreamUrl(current), 100);
  };

  return (
    <section
      ref={cctvContainerRef}
      aria-labelledby="live-cctv-heading"
      className={`${className} relative z-10 bg-slate-950 rounded-3xl border border-slate-800/90 shadow-2xl overflow-hidden ring-1 ring-white/10`}
    >
      {/* CCTV Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="live-cctv-heading" className="text-sm font-bold text-white tracking-wide">
                {cameraTitle}
              </h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> REC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {currentTime || 'SYNCHRONIZING...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              streamUrl && !streamError
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                streamUrl && !streamError
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-amber-400'
              }`}
            />
            {streamUrl && !streamError ? 'LIVE FEED' : 'STANDBY'}
          </span>

          <button
            onClick={() => setShowConfig(!showConfig)}
            type="button"
            title="Camera Settings"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={refreshFeed}
            type="button"
            title="Refresh Stream"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            type="button"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Camera URL Config Bar (Toggleable) */}
      {showConfig && (
        <form
          onSubmit={handleSaveStream}
          className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-slate-900 border-b border-slate-800"
        >
          <div className="flex-1 w-full">
            <label htmlFor="streamUrlInput" className="block text-xs font-medium text-slate-400 mb-1">
              ESP32-CAM / CCTV Stream URL (MJPEG / HTTP Stream)
            </label>
            <input
              id="streamUrlInput"
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="e.g. http://192.168.1.50:81/stream หรือ http://192.168.1.50/capture"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto sm:mt-5">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md cursor-pointer"
            >
              บันทึก URL
            </button>
            {streamUrl && (
              <button
                type="button"
                onClick={() => {
                  setInputUrl('');
                  setStreamUrl('');
                  localStorage.removeItem('cctv_stream_url');
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                ล้างค่า
              </button>
            )}
          </div>
        </form>
      )}

      {/* CCTV Large Screen Display */}
      <div className="relative w-full aspect-video min-h-[320px] sm:min-h-[440px] md:min-h-[520px] bg-black flex items-center justify-center overflow-hidden">
        {/* Authentic CCTV Viewfinder Corners */}
        <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-400/50 pointer-events-none z-20" />
        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-400/50 pointer-events-none z-20" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-400/50 pointer-events-none z-20" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-400/50 pointer-events-none z-20" />

        {/* Center Target Reticle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 opacity-30">
          <div className="relative w-12 h-12">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-400" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-400" />
            <div className="absolute inset-2 border border-cyan-400 rounded-full" />
          </div>
        </div>

        {/* CRT / Scanlines overlay effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-60" />

        {/* Overlay Info: Top Left */}
        <div className="absolute top-5 left-6 z-20 flex items-center gap-2 pointer-events-none font-mono text-xs text-cyan-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <span className="font-bold">CAM-01</span>
          <span className="text-slate-400">|</span>
          <span>{locationName}</span>
        </div>

        {/* Overlay Info: Top Right */}
        <div className="absolute top-5 right-6 z-20 font-mono text-xs text-right text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
          <p className="font-bold">1080P · 30 FPS</p>
          <p className="text-[10px] text-slate-400">ENCRYPTION: ACTIVE</p>
        </div>

        {/* Overlay Info: Bottom Left Live Clock */}
        <div className="absolute bottom-5 left-6 z-20 font-mono text-xs text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
          <p className="text-sm font-bold tracking-widest">{currentTime}</p>
          <p className="text-[10px] text-cyan-300/80">LATENCY: &lt;50ms</p>
        </div>

        {/* Overlay Info: Bottom Right */}
        <div className="absolute bottom-5 right-6 z-20 font-mono text-[11px] text-slate-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none text-right">
          <span>LAB ENTRY MONITOR</span>
        </div>

        {/* Video / Stream Feed or Placeholder */}
        {streamUrl && !streamError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={streamUrl}
            alt="Live CCTV Camera Feed"
            onLoad={() => setIsStreamLoading(false)}
            onError={() => {
              setStreamError(true);
              setIsStreamLoading(false);
            }}
            className="w-full h-full object-cover object-center select-none"
          />
        ) : (
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-md">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-slate-900/90 border border-slate-700/80 flex items-center justify-center shadow-inner">
                <VideoOff className="w-10 h-10 text-slate-500" />
              </div>
              <div className="absolute -inset-2 rounded-full border border-blue-500/20 animate-ping pointer-events-none" />
            </div>
            <h3 className="text-lg font-bold text-slate-200 tracking-wider font-mono">
              CCTV FEED STANDBY
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              กำลังรอสัญญาณภาพจากกล้องหน้าประตู (ESP32-CAM) หรือยังไม่ได้ระบุสตรีม URL
            </p>
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/25 border border-blue-400/30 cursor-pointer"
            >
              <Video className="w-4 h-4" />
              {streamUrl ? 'ตรวจสอบการตั้งค่า URL' : 'เชื่อมต่อกล้อง / ใส่ Stream URL'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
