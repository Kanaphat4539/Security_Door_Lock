'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Camera,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  Video,
  VideoOff,
} from 'lucide-react';
import { api } from '@/services/api';

const LOCKED_DEFAULT_URL = process.env.NEXT_PUBLIC_CAMERA_STREAM_URL || 'http://192.168.137.50:81/stream';

function subscribeCameraSettings(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function savedCameraUrl() {
  try {
    return localStorage.getItem('cctv_stream_url') || LOCKED_DEFAULT_URL;
  } catch {
    return LOCKED_DEFAULT_URL;
  }
}

function serverCameraUrl() { return ''; }

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
  const savedUrl = useSyncExternalStore(subscribeCameraSettings, savedCameraUrl, serverCameraUrl);
  const [streamOverride, setStreamUrl] = useState<string | null>(null);
  const [inputOverride, setInputUrl] = useState<string | null>(null);
  const streamUrl = streamOverride ?? savedUrl;
  const inputUrl = inputOverride ?? streamUrl;
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [, setIsStreamLoading] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isPageVisible, setIsPageVisible] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? !document.hidden : true;
  });
  const cctvContainerRef = useRef<HTMLDivElement>(null);

  // Pause stream when tab is not visible to save bandwidth
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Effective stream URL - only active when page is visible
  const activeStreamUrl = isPageVisible ? streamUrl : null;

  // Auto-sync with live registered camera IP from backend
  useEffect(() => {
    let active = true;
    const fetchRegisteredCam = async () => {
      try {
        const res = await api.get<{ ip: string | null }>('/devices/cam');
        if (active && res.data?.ip) {
          const autoUrl = `http://${res.data.ip}:81/stream`;
          const current = localStorage.getItem('cctv_stream_url');
          if (!current || current === LOCKED_DEFAULT_URL || current.includes(':81/stream')) {
            setStreamUrl(autoUrl);
            setInputUrl(autoUrl);
            localStorage.setItem('cctv_stream_url', autoUrl);
          }
        }
      } catch {
        // Backend not ready or offline; keeps locked default
      }
    };
    void fetchRegisteredCam();
    return () => {
      active = false;
    };
  }, []);

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

  const [isCapturing, setIsCapturing] = useState(false);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);

  const handleCaptureSnapshot = async () => {
    try {
      setIsCapturing(true);
      setCaptureNotice('กำลังส่งคำสั่งถ่ายภาพ...');
      const res = await api.get<{ ok: boolean; imagePath: string | null }>('/devices/cam/capture');
      if (res.data?.ok && res.data.imagePath) {
        setCaptureNotice(`บันทึกภาพสำเร็จ! (${res.data.imagePath})`);
        setTimeout(() => setCaptureNotice(null), 4000);
        return;
      }
      throw new Error('Backend capture failed');
    } catch {
      try {
        const urlObj = new URL(streamUrl);
        const directCapture = `${urlObj.protocol}//${urlObj.hostname}/capture`;
        window.open(directCapture, '_blank');
        setCaptureNotice('เปิดหน้าต่างบันทึกภาพจากกล้องแล้ว');
        setTimeout(() => setCaptureNotice(null), 3000);
      } catch {
        setCaptureNotice('ไม่สามารถบันทึกภาพได้');
        setTimeout(() => setCaptureNotice(null), 3000);
      }
    } finally {
      setIsCapturing(false);
    }
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
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> MJPEG
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
                      activeStreamUrl && !streamError
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        activeStreamUrl && !streamError
                          ? 'bg-emerald-400 animate-ping'
                          : 'bg-amber-400'
                      }`}
                    />
                    {activeStreamUrl && !streamError ? 'LIVE FEED' : 'STANDBY'}
                  </span>

          <button
            onClick={handleCaptureSnapshot}
            disabled={isCapturing}
            type="button"
            title="ถ่ายภาพจากกล้องและบันทึกภาพ"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors border border-emerald-500/40 cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isCapturing ? 'กำลังถ่าย...' : 'ถ่ายภาพ'}</span>
          </button>

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
            <a
              href="http://192.168.137.50/"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
              title="เปิดแผงควบคุมและปรับความละเอียด/FPS สดๆ จากกล้อง"
            >
              ปรับโหมดกล้อง (Max FPS)
            </a>
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

        {/* Capture Snapshot Feedback Banner */}
        {captureNotice && (
          <div className="absolute top-12 left-6 right-6 z-30 py-2 px-4 rounded-xl bg-slate-900/95 border border-emerald-500/60 text-emerald-400 text-xs font-mono flex items-center justify-between shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="flex items-center gap-2 font-semibold">
              <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
              {captureNotice}
            </span>
            <button
              onClick={() => setCaptureNotice(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Overlay Info: Top Right */}
        <div className="absolute top-5 right-6 z-20 font-mono text-xs text-right text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
          <p className="font-bold">VGA · MJPEG</p>
          <p className="text-[10px] text-slate-400">STREAM URL CONFIGURED BY USER</p>
        </div>

        {/* Overlay Info: Bottom Left Live Clock */}
        <div className="absolute bottom-5 left-6 z-20 font-mono text-xs text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
          <p className="text-sm font-bold tracking-widest">{currentTime}</p>
          <p className="text-[10px] text-cyan-300/80">LOCAL DISPLAY TIME</p>
        </div>

        {/* Overlay Info: Bottom Right */}
        <div className="absolute bottom-5 right-6 z-20 font-mono text-[11px] text-slate-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none text-right">
          <span>LAB ENTRY MONITOR</span>
        </div>

        {/* Video / Stream Feed or Placeholder */}
                {activeStreamUrl && !streamError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeStreamUrl}
                    alt="Live CCTV Camera Feed"
                    onLoad={() => setIsStreamLoading(false)}
                    onError={() => {
                      setStreamError(true);
                      setIsStreamLoading(false);
                      setTimeout(() => {
                        setStreamError(false);
                      }, 2500);
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
