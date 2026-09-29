// Service layer — คุยกับ Nest backend ของเรา แล้วแปลงข้อมูลให้ตรงกับ UI ของ aniwat
//
// backend route: /auth, /access, /users, /devices  (ไม่มี prefix /api)
// auth: เก็บ JWT ใน localStorage 'auth_token' + role ใน cookie 'user_role' (ให้ middleware อ่าน)
import { api } from './api';
import { useLogStore, type AccessLog } from '@/store/useLogStore';

export type BackendRole = 'ADMIN' | 'USER' | 'GUARD';
export type UiRole = 'admin' | 'guard';

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
    ...a,
    imageUrl: filename ? `${API_BASE}/access/image/${filename}` : undefined,
  };
}

export const roleToUi = (r: BackendRole): UiRole =>
  r === 'ADMIN' ? 'admin' : 'guard';

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
  useLogStore.getState().clearLogs();
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
  email: string | null;
  emailNotificationsEnabled: boolean;
  dashboardAccount: { username: string } | null;
  createdAt: string;
  updatedAt: string;
  _count?: { logs: number };
}

export async function fetchUsers(): Promise<BackendUser[]> {
  const { data } = await api.get<BackendUser[]>('/users');
  return data;
}
export async function createUser(uid: string, name: string, email?: string, emailNotificationsEnabled = false) {
  const { data } = await api.post<BackendUser>('/users', { uid, name, email, emailNotificationsEnabled });
  return data;
}
export async function updateUser(
  id: number,
  patch: { name?: string; isActive?: boolean; email?: string | null; emailNotificationsEnabled?: boolean },
) {
  const { data } = await api.patch<BackendUser>(`/users/${id}`, patch);
  return data;
}

export async function fetchHistoryPage(beforeId?: number): Promise<{ logs: AccessLog[]; nextCursor: number | null }> {
  const { data } = await api.get<{ logs: AccessAttempt[]; nextCursor: number | null }>('/access/history', {
    params: beforeId === undefined ? undefined : { beforeId },
  });
  return { logs: data.logs.map(mapAccessAttempt), nextCursor: data.nextCursor };
}

export interface NotificationSettings {
  linked: boolean;
  name: string | null;
  email: string | null;
  enabled: boolean;
  uid: string | null;
  isActive: boolean | null;
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const { data } = await api.get<NotificationSettings>('/notification-settings');
  return data;
}

export async function updateNotificationSettings(enabled: boolean): Promise<NotificationSettings> {
  const { data } = await api.patch<NotificationSettings>('/notification-settings', { enabled });
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

// ===================== guards & invite codes =====================
export interface InviteCodeItem {
  id: number;
  code: string;
  isUsed: boolean;
  usedBy: string | null;
  expiresAt: string | null;
  createdAt: string;
  usedAt: string | null;
  status: 'active' | 'used' | 'expired';
}

export async function fetchInviteCodes(): Promise<InviteCodeItem[]> {
  const { data } = await api.get<InviteCodeItem[]>('/guards/invite-codes');
  return data;
}

export async function createInviteCode(
  expiresInMinutes = 60,
  customCode?: string,
): Promise<InviteCodeItem> {
  const { data } = await api.post<InviteCodeItem>('/guards/invite-codes', {
    expiresInMinutes,
    code: customCode || undefined,
  });
  return data;
}

export async function deleteInviteCode(
  id: number,
): Promise<{ success: boolean; message: string }> {
  const { data } = await api.delete<{ success: boolean; message: string }>(
    `/guards/invite-codes/${id}`,
  );
  return data;
}

export interface GuardAccount {
  id: number;
  username: string;
  role: 'GUARD';
  createdAt: string;
  updatedAt: string;
}

export async function fetchGuards(): Promise<GuardAccount[]> {
  const { data } = await api.get<GuardAccount[]>('/guards');
  return data;
}

export async function deleteGuard(id: number): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/guards/${id}`);
  return data;
}

