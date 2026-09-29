// Service layer — คุยกับ Nest backend ของเรา แล้วแปลงข้อมูลให้ตรงกับ UI ของ aniwat
//
// backend route: /auth, /access, /users, /devices  (ไม่มี prefix /api)
// auth: เก็บ JWT ใน localStorage 'auth_token' + role ใน cookie 'user_role' (ให้ middleware อ่าน)
import { api } from './api';
import type { AccessLog, AccessStatus } from '@/store/useLogStore';

export type BackendRole = 'ADMIN' | 'USER';
export type UiRole = 'admin' | 'employee';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ===================== แปลง data =====================
// backend AccessAttempt -> aniwat AccessLog
interface AccessAttempt {
  id: number;
  uid: string;
  direction: 'in' | 'out';
  status: 'granted' | 'denied';
  imagePath: string | null;
  userName: string | null;
  createdAt: string;
}

export function mapAccessAttempt(a: AccessAttempt): AccessLog {
  const filename = a.imagePath ? a.imagePath.split('/').pop() : null;
  return {
    id: String(a.id),
    userId: null,
    userName: a.userName ?? undefined,
    uid: a.uid,
    timestamp: a.createdAt,
    status: (a.status === 'granted' ? 'GRANTED' : 'DENIED') as AccessStatus,
    doorId: a.direction === 'in' ? 'Entry' : 'Exit',
    imageUrl: filename ? `${API_BASE}/access/image/${filename}` : undefined,
  };
}

export const roleToUi = (r: BackendRole): UiRole =>
  r === 'ADMIN' ? 'admin' : 'employee';

// ===================== auth =====================
function setSession(token: string, uiRole: UiRole) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user_role', uiRole);
  // cookie ให้ middleware (server) อ่าน role ได้
  document.cookie = `user_role=${uiRole}; path=/; max-age=86400`;
}

export async function login(
  username: string,
  password: string,
): Promise<UiRole> {
  const { data } = await api.post<{ token: string }>('/auth/login', {
    username,
    password,
  });
  localStorage.setItem('auth_token', data.token);
  const me = await api.get<{ id: number; role: BackendRole }>('/auth/me');
  const uiRole = roleToUi(me.data.role);
  setSession(data.token, uiRole);
  return uiRole;
}

export async function register(
  username: string,
  password: string,
  inviteCode: string,
): Promise<UiRole> {
  const { data } = await api.post<{ token: string }>('/auth/register', {
    username,
    password,
    inviteCode,
  });
  localStorage.setItem('auth_token', data.token);
  const me = await api.get<{ id: number; role: BackendRole }>('/auth/me');
  const uiRole = roleToUi(me.data.role);
  setSession(data.token, uiRole);
  return uiRole;
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_role');
  document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
}

// ตั๋วอายุสั้นสำหรับต่อ WebSocket (backend บังคับตรวจตอน handshake)
export async function getWsTicket(): Promise<string> {
  const { data } = await api.post<{ ticket: string }>('/auth/ws-ticket');
  return data.ticket;
}

// ===================== access logs =====================
export async function fetchRecentLogs(): Promise<AccessLog[]> {
  const { data } = await api.get<AccessAttempt[]>('/access/recent');
  return data.map(mapAccessAttempt);
}

export interface AccessStats {
  entriesToday: number;
  deniedToday: number;
  totalUsers: number;
  activeUsers: number;
}
export async function fetchStats(): Promise<AccessStats> {
  const { data } = await api.get<AccessStats>('/access/stats');
  return data;
}

// ===================== users =====================
export interface BackendUser {
  id: number;
  uid: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { logs: number };
}

export async function fetchUsers(): Promise<BackendUser[]> {
  const { data } = await api.get<BackendUser[]>('/users');
  return data;
}
export async function createUser(uid: string, name: string) {
  const { data } = await api.post<BackendUser>('/users', { uid, name });
  return data;
}
export async function updateUser(
  id: number,
  patch: { name?: string; isActive?: boolean },
) {
  const { data } = await api.patch<BackendUser>(`/users/${id}`, patch);
  return data;
}
export async function deleteUser(id: number) {
  await api.delete(`/users/${id}`);
}
export interface UnassignedUid {
  uid: string;
  attempts: number;
  lastSeenAt: string | null;
}
export async function fetchUnassignedUids(): Promise<UnassignedUid[]> {
  const { data } = await api.get<UnassignedUid[]>('/users/unassigned-uids');
  return data;
}
