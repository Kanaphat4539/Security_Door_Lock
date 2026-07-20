"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { WS_EVENT_ACCESS, type AccessAttempt } from "@/types";

type ConnectionState = "connecting" | "connected" | "disconnected";

/**
 * ฟัง event 'access' จาก backend แล้วเรียก onAccess ทุกครั้งที่มีคนทาบบัตร
 *
 * ขอ "ตั๋วอายุสั้น" จาก /api/ws-ticket แทนการใช้ token ตัวจริง
 * ตั๋วมีอายุ 60 วินาที และใช้ต่อ WebSocket ได้อย่างเดียว
 * ถ้าหลุด session (401) จะพาไปหน้า login
 */
export function useRealtimeAccess(
  onAccess: (log: AccessAttempt) => void,
): ConnectionState {
  const [state, setState] = useState<ConnectionState>("connecting");

  // เก็บ callback ล่าสุดไว้ใน ref เพื่อไม่ให้ effect ต่อ socket ใหม่ทุกครั้งที่ re-render
  // (ต้องเซ็ตใน effect ไม่ใช่ตอน render — แก้ ref ระหว่าง render ผิดกฎ React)
  const handlerRef = useRef(onAccess);
  useEffect(() => {
    handlerRef.current = onAccess;
  }, [onAccess]);

  useEffect(() => {
    let socket: Socket | undefined;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/ws-ticket");
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        const { url, ticket } = (await res.json()) as {
          url: string;
          ticket: string;
        };
        if (cancelled) return;

        // ตั๋วถูกใช้ตอน handshake ครั้งเดียว หลังจากนั้น socket.io ถือ
        // connection ไว้เอง ตั๋วหมดอายุระหว่างทางไม่ทำให้หลุด
        socket = io(url, { auth: { token: ticket }, transports: ["websocket"] });

        socket.on("connect", () => setState("connected"));
        socket.on("disconnect", () => setState("disconnected"));
        socket.on("connect_error", () => setState("disconnected"));
        socket.on(WS_EVENT_ACCESS, (log: AccessAttempt) =>
          handlerRef.current(log),
        );
      } catch {
        if (!cancelled) setState("disconnected");
      }
    })();

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, []);

  return state;
}
