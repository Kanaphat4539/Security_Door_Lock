'use client';

import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';

// Initial mock data
const initialUsers = [
  { id: '1', name: 'John Doe', role: 'Employee', uid: 'A1B2C3D4', department: 'Engineering', status: 'Active' },
  { id: '2', name: 'Jane Smith', role: 'Admin', uid: 'E5F6G7H8', department: 'HR', status: 'Active' },
  { id: '3', name: 'Mike Johnson', role: 'Employee', uid: 'I9J0K1L2', department: 'Sales', status: 'Inactive' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    uid: '',
    department: '',
    role: 'Employee',
    status: 'Active'
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setFormData({ name: '', uid: '', department: '', role: 'Employee', status: 'Active' });
    setEditingUserId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: typeof initialUsers[0]) => {
    setFormData({ name: user.name, uid: user.uid, department: user.department, role: user.role, status: user.status });
    setEditingUserId(user.id);
    setIsModalOpen(true);
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.uid) return;

    if (editingUserId) {
      setUsers(users.map(u => u.id === editingUserId ? { ...formData, id: editingUserId } : u));
    } else {
      const userToAdd = {
        id: Math.random().toString(36).substring(2, 9),
        ...formData
      };
      setUsers([...users, userToAdd]);
    }

    setIsModalOpen(false);
    setFormData({ name: '', uid: '', department: '', role: 'Employee', status: 'Active' });
    setEditingUserId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl ring-1 ring-white/50 dark:ring-white/5 relative overflow-hidden transition-all duration-500 hover:shadow-blue-500/10 hover:border-blue-200/80 dark:hover:border-blue-800/50">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/10 dark:bg-blue-600/10 blur-3xl rounded-full pointer-events-none transition-colors duration-500"></div>
        <div className="relative z-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">User Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage employees, RFID cards, and access roles.</p>
        </div>
        <button
          onClick={openAddModal}
          className="relative z-10 flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 group"
        >
          <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          Add User
        </button>
      </div>

      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl overflow-hidden ring-1 ring-white/50 dark:ring-white/5 relative transition-all duration-500">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/60 bg-slate-50/30 dark:bg-slate-800/30">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or RFID UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200/60 dark:border-slate-700/60 rounded-xl leading-5 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 sm:text-sm transition-all backdrop-blur-sm shadow-inner hover:bg-white/80 dark:hover:bg-slate-800/80"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-700/60">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">RFID UID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 mr-3 shadow-sm border border-blue-200/50 dark:border-blue-800/50">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded inline-block shadow-sm">
                      {user.uid}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${user.role === 'Admin' ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' : 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${user.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                      }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm rounded-lg transition-all dark:hover:bg-blue-900/30 dark:hover:text-blue-400">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-sm rounded-lg transition-all dark:hover:bg-red-900/30 dark:hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No users found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/60 ring-1 ring-white/50 dark:ring-white/10 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 dark:bg-blue-600/10 blur-2xl rounded-full pointer-events-none"></div>
            
            <div className="flex items-center justify-between p-6 border-b border-slate-200/80 dark:border-slate-700/60 relative z-10 bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editingUserId ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
                {editingUserId ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-lg backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white backdrop-blur-sm shadow-inner transition-all hover:bg-white/80 dark:hover:bg-slate-800/80"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">RFID UID</label>
                <input
                  type="text"
                  required
                  value={formData.uid}
                  onChange={e => setFormData({ ...formData, uid: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-mono backdrop-blur-sm shadow-inner transition-all hover:bg-white/80 dark:hover:bg-slate-800/80"
                  placeholder="A1B2C3D4"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white backdrop-blur-sm shadow-inner transition-all hover:bg-white/80 dark:hover:bg-slate-800/80"
                  placeholder="Engineering"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white backdrop-blur-sm shadow-inner transition-all hover:bg-white/80 dark:hover:bg-slate-800/80 appearance-none"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white backdrop-blur-sm shadow-inner transition-all hover:bg-white/80 dark:hover:bg-slate-800/80 appearance-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/50 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100/80 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                >
                  {editingUserId ? 'Update User' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
