'use client';

import React, { useEffect, useState } from 'react';

// รูปหลักฐานจาก backend (GET /access/image/:file) ต้องแนบ Bearer token
// แต่ <img src> แนบ header เองไม่ได้ → fetch เป็น blob พร้อม token แล้วสร้าง object URL
// (แนวเดียวกับ AuthImage ของ UI รอบก่อน)
export default function AuthImage({
  src,
  alt = 'snapshot',
  className = '',
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [objUrl, setObjUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setObjUrl(null);
    setError(false);

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    fetch(src, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setObjUrl(created);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [src]);

  if (error) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500">
        โหลดรูปไม่ได้
      </span>
    );
  }

  if (!objUrl) {
    return (
      <div
        className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-md ${className}`}
      />
    );
  }

  return (
    <a href={objUrl} target="_blank" rel="noopener noreferrer" title="เปิดรูปเต็ม">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={objUrl}
        alt={alt}
        className={`object-cover rounded-md border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-blue-400 transition ${className}`}
      />
    </a>
  );
}
