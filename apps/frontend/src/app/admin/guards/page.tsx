'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  Shield,
  RefreshCw,
  Search,
  UserCheck,
  Sparkles,
  AlertCircle,
  Users,
} from 'lucide-react';
import {
  fetchInviteCodes,
  createInviteCode,
  deleteInviteCode,
  fetchGuards,
  deleteGuard,
  type InviteCodeItem,
  type GuardAccount,
} from '@/services/backend';

export default function AdminGuardsPage() {
  const [inviteCodes, setInviteCodes] = useState<InviteCodeItem[]>([]);
  const [guards, setGuards] = useState<GuardAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiresInMinutes, setExpiresInMinutes] = useState(60);
  const [customCode, setCustomCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<InviteCodeItem | null>(null);
  const [activeTab, setActiveTab] = useState<'keys' | 'guards'>('keys');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [codesData, guardsData] = await Promise.all([
        fetchInviteCodes().catch(() => []),
        fetchGuards().catch(() => []),
      ]);
      setInviteCodes(codesData);
      setGuards(guardsData);
    } catch (err) {
      console.error('Failed to load guard invite codes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await createInviteCode(
        expiresInMinutes,
        customCode.trim() ? customCode.trim() : undefined,
      );
      setNewlyCreatedKey(created);
      setCustomCode('');
      setExpiresInMinutes(60);
      await loadData();
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'สร้างรหัสเชิญไม่สำเร็จ';
      alert(errorMsg || 'เกิดข้อผิดพลาดในการสร้างรหัส');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCode = async (id: number) => {
    // ลบทันทีตามคำสั่ง ("เมื่อจะลบก็ลบไปเลย")
    try {
      await deleteInviteCode(id);
      if (newlyCreatedKey?.id === id) {
        setNewlyCreatedKey(null);
      }
      setInviteCodes((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert('ลบรหัสไม่สำเร็จ');
      console.error(err);
    }
  };

  const handleDeleteGuard = async (id: number, username: string) => {
    if (window.confirm(`ต้องการลบบัญชีผู้ช่วย (GUARD) "${username}" ออกจากระบบใช่หรือไม่?`)) {
      try {
        await deleteGuard(id);
        setGuards((prev) => prev.filter((g) => g.id !== id));
      } catch (err) {
        alert('ลบบัญชีไม่สำเร็จ');
        console.error(err);
      }
    }
  };

  const getRemainingTime = (expiresAt: string | null) => {
    if (!expiresAt) return 'ไม่มีวันหมดอายุ';
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'หมดอายุแล้ว';

    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `เหลือ ${days} วัน ${hours % 24} ชม.`;
    if (hours > 0) return `เหลือ ${hours} ชม. ${mins % 60} นาที`;
    return `เหลือ ${mins} นาที`;
  };

  const filteredCodes = inviteCodes.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.usedBy && c.usedBy.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredGuards = guards.filter((g) =>
    g.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeKeysCount = inviteCodes.filter((c) => c.status === 'active').length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl ring-1 ring-white/50 dark:ring-white/5 relative overflow-hidden transition-all duration-500">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-600/15 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              GUARD Key Management
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                {activeKeysCount} Active Keys
              </span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              สร้างรหัสเชิญสำหรับสมัคร GUARD แบบ User ต่อ User (มีเวลาจำกัด และลบได้ทันที)
            </p>
          </div>
        </div>

        <button
          onClick={() => loadData()}
          className="relative z-10 flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          <span>รีเฟรชข้อมูล</span>
        </button>
      </div>

      {/* GENERATE KEY FORM (แสดงในหน้าโดยตรง ไม่ต้องมี Popup/Modal หรือ Scroll) */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border border-indigo-100/90 dark:border-indigo-900/40 shadow-xl ring-1 ring-white/50 dark:ring-white/5 relative overflow-hidden transition-all duration-500">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            สร้างรหัสเชิญใหม่ (Generate GUARD Invite Key)
          </h2>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Expiration selection */}
            <div className="lg:col-span-7 space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                1. เลือกระยะเวลาการใช้งานของรหัส (Expiration Time)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { label: '15 นาที', value: 15 },
                  { label: '30 นาที', value: 30 },
                  { label: '1 ชั่วโมง (แนะนำ)', value: 60 },
                  { label: '6 ชั่วโมง', value: 360 },
                  { label: '1 วัน (24 ชม.)', value: 1440 },
                  { label: '3 วัน', value: 4320 },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setExpiresInMinutes(option.value)}
                    className={`py-3 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                      expiresInMinutes === option.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm ring-2 ring-indigo-500/30 font-extrabold'
                        : 'border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  หรือระบุจำนวนนาทีเอง:
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    min="1"
                    max="10080"
                    value={expiresInMinutes}
                    onChange={(e) => setExpiresInMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full pl-3.5 pr-14 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                    นาที
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Custom Code & Notes */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  2. กำหนดรหัสเอง (Optional)
                </label>
                <input
                  type="text"
                  placeholder="เว้นว่างไว้เพื่อให้ระบบสุ่มรหัสให้อัตโนมัติ"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:normal-case placeholder:text-slate-400"
                />
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold">กติกาการใช้งานรหัสเชิญ:</p>
                  <p className="mt-0.5 text-amber-700/90 dark:text-amber-400/90">
                    รหัสเป็นแบบ <strong>User ต่อ User (1 คนต่อ 1 รหัส)</strong> เมื่อนำไปสมัครแล้วจะใช้ซ้ำไม่ได้ และจะหมดอายุอัตโนมัติเมื่อครบเวลาที่กำหนด
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>สร้างรหัสเชิญ (Generate Key)</span>
            </button>
          </div>
        </form>

        {/* Newly Created Key Display Banner */}
        {newlyCreatedKey && (
          <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 dark:from-indigo-950/50 dark:via-blue-950/40 dark:to-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                  รหัสเชิญพร้อมใช้งาน (นำรหัสนี้ส่งให้ผู้ใช้สมัครได้ทันที):
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="font-mono text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-4 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-inner select-all">
                    {newlyCreatedKey.code}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium bg-white/60 dark:bg-slate-900/60 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
                    <Clock className="w-4 h-4 text-amber-500" />
                    {getRemainingTime(newlyCreatedKey.expiresAt)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleCopy(newlyCreatedKey.code)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 shrink-0 self-end md:self-auto"
            >
              {copiedCode === newlyCreatedKey.code ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>คัดลอกรหัสแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>คัดลอกรหัสเชิญ</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl overflow-hidden ring-1 ring-white/50 dark:ring-white/5 relative transition-all duration-500">
        {/* Navigation Tabs & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-700/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/40 dark:bg-slate-800/40">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('keys')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'keys'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>รหัสเชิญทั้งหมด ({inviteCodes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('guards')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'guards'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>บัญชี GUARD ในระบบ ({guards.length})</span>
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder={activeTab === 'keys' ? 'ค้นหารหัส หรือชื่อผู้ใช้...' : 'ค้นหาชื่อผู้ใช้...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200/60 dark:border-slate-700/60 rounded-xl leading-5 bg-white/70 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-xs transition-all"
            />
          </div>
        </div>

        {/* Tab 1: Keys Table */}
        {activeTab === 'keys' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">รหัสเชิญ (Invite Key)</th>
                  <th className="px-6 py-4">สถานะ (Status)</th>
                  <th className="px-6 py-4">ระยะเวลาที่เหลือ / วันหมดอายุ</th>
                  <th className="px-6 py-4">ผู้ใช้งาน (Used By)</th>
                  <th className="px-6 py-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                      ไม่พบรายการรหัสเชิญที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredCodes.map((item) => {
                    const isCopied = copiedCode === item.code;
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          item.status === 'expired'
                            ? 'opacity-60 bg-slate-50/30 dark:bg-slate-900/20'
                            : item.status === 'used'
                            ? 'bg-amber-50/20 dark:bg-amber-950/10'
                            : ''
                        }`}
                      >
                        {/* Code Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                              {item.code}
                            </span>
                            <button
                              onClick={() => handleCopy(item.code)}
                              title="คัดลอกรหัส"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              {isCopied ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.status === 'active' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              พร้อมใช้งาน
                            </span>
                          )}
                          {item.status === 'used' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400">
                              <UserCheck className="w-3.5 h-3.5" />
                              ใช้งานแล้ว
                            </span>
                          )}
                          {item.status === 'expired' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-red-700 bg-red-100 border border-red-200 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-400">
                              <Clock className="w-3.5 h-3.5" />
                              หมดอายุ
                            </span>
                          )}
                        </td>

                        {/* Expiration Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {getRemainingTime(item.expiresAt)}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {item.expiresAt
                              ? `หมดอายุ: ${new Date(item.expiresAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })} (${new Date(item.expiresAt).toLocaleDateString()})`
                              : 'ไม่มีกำหนด'}
                          </div>
                        </td>

                        {/* Used By Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.isUsed ? (
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {item.usedBy || 'ไม่ทราบชื่อ'}
                              </span>
                              {item.usedAt && (
                                <p className="text-[10px] text-slate-400">
                                  {new Date(item.usedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">ยังไม่มีผู้ใช้</span>
                          )}
                        </td>

                        {/* Delete Button (ลบได้ทันทีตามคำสั่ง "เมื่อจะลบก็ลบไปเลย") */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteCode(item.id)}
                            title="ลบรหัสนี้ทันที"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-all active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบ</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tab 2: Guards Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">วันที่ลงทะเบียน</th>
                  <th className="px-6 py-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredGuards.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                      ไม่พบบัญชีผู้ช่วย GUARD ในระบบ
                    </td>
                  </tr>
                ) : (
                  filteredGuards.map((guard) => (
                    <tr key={guard.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs shadow-sm">
                            {guard.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {guard.username}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                          <Shield className="w-3.5 h-3.5" />
                          GUARD
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(guard.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDeleteGuard(guard.id, guard.username)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-all active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบบัญชี</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
