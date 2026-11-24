'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { getInventoryStore } from '../../lib/store/inventory-store';

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
}

export default function StaffPage() {
  const { session } = useAuth();
  const store = getInventoryStore();
  const currentOrgId = session?.orgId || store.orgId || '00000000-0000-0000-0000-000000000001';

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetModalStaff, setResetModalStaff] = useState<StaffMember | null>(null);
  const [newStaff, setNewStaff] = useState({ name: '', phone: '', pin: '' });
  const [newPin, setNewPin] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadStaff() {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff?orgId=${currentOrgId}`);
      const data = await res.json();
      if (res.ok && data.staff && data.staff.length > 0) {
        setStaffList(data.staff);
      } else {
        // Fall back to local store staff if none returned
        setStaffList(store.staffProfiles);
      }
    } catch {
      setStaffList(store.staffProfiles);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, [currentOrgId]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStaff.pin.length < 4 || newStaff.pin.length > 6) {
      alert('PIN must be 4 to 6 digits.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          orgId: currentOrgId,
          name: newStaff.name,
          phone: newStaff.phone,
          pin: newStaff.pin,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: `Staff member "${newStaff.name}" created! Login with Phone ${newStaff.phone} and PIN.`,
        });
        setShowAddModal(false);
        setNewStaff({ name: '', phone: '', pin: '' });
        await loadStaff();
      } else {
        // Fall back to local store
        store.staffProfiles.push({
          id: `st-${Date.now()}`,
          orgId: currentOrgId,
          name: newStaff.name,
          phone: newStaff.phone,
          role: 'user',
          isActive: true,
          pin: newStaff.pin,
          createdAt: new Date().toISOString(),
        });
        setStaffList([...store.staffProfiles]);
        setShowAddModal(false);
        setNewStaff({ name: '', phone: '', pin: '' });
        setNotification({
          type: 'success',
          message: `Staff member "${newStaff.name}" added successfully.`,
        });
      }
    } catch {
      // Local fallback
      store.staffProfiles.push({
        id: `st-${Date.now()}`,
        orgId: currentOrgId,
        name: newStaff.name,
        phone: newStaff.phone,
        role: 'user',
        isActive: true,
        pin: newStaff.pin,
        createdAt: new Date().toISOString(),
      });
      setStaffList([...store.staffProfiles]);
      setShowAddModal(false);
      setNewStaff({ name: '', phone: '', pin: '' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleToggleActive = async (staff: StaffMember) => {
    const nextState = !staff.isActive;
    try {
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_active',
          staffId: staff.id,
          isActive: nextState,
        }),
      });
    } catch (err) {
      console.error(err);
    }
    setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, isActive: nextState } : s));
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4 || newPin.length > 6) {
      alert('PIN must be 4 to 6 digits.');
      return;
    }

    if (!resetModalStaff) return;

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_pin',
          staffId: resetModalStaff.id,
          pin: newPin,
        }),
      });
      if (res.ok) {
        setNotification({
          type: 'success',
          message: `PIN for ${resetModalStaff.name} has been reset successfully.`,
        });
      }
    } catch (err) {
      console.error(err);
    }

    setResetModalStaff(null);
    setNewPin('');
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            👥 Staff &amp; Roles Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create team accounts with mobile Phone + PIN authentication for barcode scanning and inwards.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-colors"
        >
          + Add Staff Member
        </button>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 font-black ml-4">✕</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">
            Active Staff Members ({staffList.length})
          </h2>
          <button
            onClick={loadStaff}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
            <tr>
              <th className="px-6 py-3.5">Staff Name</th>
              <th className="px-6 py-3.5">Phone (Login ID)</th>
              <th className="px-6 py-3.5">Assigned Role</th>
              <th className="px-6 py-3.5">Account Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffList.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/80">
                <td className="px-6 py-4 font-bold text-slate-900 flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-black text-xs text-slate-700">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span>{s.name}</span>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-slate-700">{s.phone}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 uppercase">
                    {s.role === 'user' ? 'Floor Staff' : s.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleActive(s)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase transition-colors ${
                      s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {s.isActive ? 'Active' : 'Deactivated'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => {
                      setResetModalStaff(s);
                      setNewPin('');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors"
                  >
                    Reset PIN
                  </button>
                </td>
              </tr>
            ))}
            {staffList.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  No staff members registered yet. Click &quot;Add Staff Member&quot; to provision team accounts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddStaff} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">Add Staff Account</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Mobile Phone (Login) *</label>
                <input
                  type="tel"
                  required
                  value={newStaff.phone}
                  onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                  placeholder="9876543210"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg font-mono font-semibold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">4–6 Digit Login PIN *</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  minLength={4}
                  value={newStaff.pin}
                  onChange={e => setNewStaff({ ...newStaff, pin: e.target.value })}
                  placeholder="••••"
                  className="mt-1 w-full p-2.5 border border-slate-200 rounded-lg tracking-widest font-mono text-center text-base font-black"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create Staff Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset PIN Modal */}
      {resetModalStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleResetPin} className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Reset PIN for {resetModalStaff.name}
            </h3>
            <div>
              <label className="text-xs font-bold text-slate-700">Enter New 4-6 Digit PIN</label>
              <input
                type="password"
                required
                maxLength={6}
                minLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="••••"
                className="mt-1.5 w-full p-2.5 border border-slate-200 rounded-lg tracking-widest font-mono text-center text-lg font-black"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalStaff(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs"
              >
                Save New PIN
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
