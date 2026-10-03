import React, { useState, useEffect } from 'react';
import { useAuth, DEFAULT_STAFF_PERMISSIONS, DEFAULT_ADMIN_PERMISSIONS } from '../../context/AuthContext';
import { AppUser, UserRole, UserPermissions } from '../../types';
import { subscribeAppUsers, addAppUser, updateAppUser, deleteAppUser } from '../../services/db';
import { BottomSheet } from '../common/BottomSheet';
import { Users, UserPlus, Shield, Eye, Lock, Check, Trash2, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

export const UsersView: React.FC = () => {
  const { appUser, isAdmin } = useAuth();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AppUser | null>(null);

  // New User Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Staff');
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_STAFF_PERMISSIONS);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAppUsers((data) => setUsers(data));
    return () => unsub();
  }, []);

  const handleOpenAdd = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('Staff');
    setPermissions(DEFAULT_STAFF_PERMISSIONS);
    setFormError(null);
    setIsAddUserOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'Admin') {
      setPermissions(DEFAULT_ADMIN_PERMISSIONS);
    } else {
      setPermissions(DEFAULT_STAFF_PERMISSIONS);
    }
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveUser = async () => {
    try {
      setFormError(null);
      if (!name.trim()) {
        setFormError('Please enter user name');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setFormError('Please enter a valid email address');
        return;
      }

      setIsSubmitting(true);

      const newUserData: Omit<AppUser, 'createdAt' | 'updatedAt'> = {
        uid: `user-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        permissions,
        createdBy: appUser?.email || 'sahil@sanzari.com',
      };

      await addAppUser(newUserData);

      setIsAddUserOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserPermission = async (u: AppUser, permKey: keyof UserPermissions) => {
    try {
      const updatedPerms = {
        ...u.permissions,
        [permKey]: !u.permissions[permKey],
      };
      await updateAppUser(u.uid, { permissions: updatedPerms });
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  const handleDelete = async (u: AppUser) => {
    if (u.role === 'Admin' && u.email === 'sahil@sanzari.com') {
      alert('Main Admin account cannot be deleted!');
      return;
    }
    if (confirm(`Are you sure you want to delete user ${u.name}?`)) {
      await deleteAppUser(u.uid);
    }
  };

  return (
    <div className="space-y-4 pb-28 md:pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950 flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            <span>Users &amp; Staff Access Control</span>
          </h2>
          <p className="text-xs text-zinc-600 font-medium">
            Manage staff login accounts, view/edit permissions, and control cost price visibility
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <UserPlus size={16} />
            <span>+ Add Staff / User</span>
          </button>
        )}
      </div>

      {/* Main Admin Card */}
      <div className="p-4 rounded-2xl bg-zinc-950 text-white shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white font-black text-lg flex items-center justify-center border border-white/20">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">Main Admin (Sahil)</h3>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-violet-500/30 text-violet-300 border border-violet-400/30">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-xs text-zinc-400">sahil@sanzari.com • Full Unrestricted Access</p>
          </div>
        </div>
      </div>

      {/* Registered Staff Users List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          Staff Members &amp; Registered Accounts ({users.length})
        </h3>

        {users.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-xs text-zinc-500">
            No additional staff users created yet. Click "+ Add Staff / User" above to create an account for your staff.
          </div>
        ) : (
          <div className="space-y-2.5">
            {users.map((u) => (
              <motion.div
                key={u.uid}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-900 font-bold text-sm flex items-center justify-center border border-zinc-200">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-zinc-950">{u.name}</h4>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            u.role === 'Admin'
                              ? 'bg-violet-100 text-violet-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{u.email}</p>
                    </div>
                  </div>

                  {isAdmin && u.email !== 'sahil@sanzari.com' && (
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Granular Permission Toggles */}
                <div className="pt-2 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Cost Price Visibility */}
                  <button
                    disabled={!isAdmin}
                    onClick={() => handleToggleUserPermission(u, 'canViewCostPrice')}
                    className={`p-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      u.permissions?.canViewCostPrice
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {u.permissions?.canViewCostPrice ? <Eye size={13} /> : <Lock size={13} />}
                    <span>Cost Price: {u.permissions?.canViewCostPrice ? 'VISIBLE' : 'HIDDEN'}</span>
                  </button>

                  {/* Wallet Balance Visibility */}
                  <button
                    disabled={!isAdmin}
                    onClick={() => handleToggleUserPermission(u, 'canViewWalletBalances')}
                    className={`p-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      u.permissions?.canViewWalletBalances
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {u.permissions?.canViewWalletBalances ? <Eye size={13} /> : <Lock size={13} />}
                    <span>Wallet Balances: {u.permissions?.canViewWalletBalances ? 'VISIBLE' : 'HIDDEN'}</span>
                  </button>

                  {/* Can Add Sale */}
                  <button
                    disabled={!isAdmin}
                    onClick={() => handleToggleUserPermission(u, 'canAddSale')}
                    className={`p-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      u.permissions?.canAddSale
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}
                  >
                    <Check size={13} />
                    <span>Add Sale: {u.permissions?.canAddSale ? 'YES' : 'NO'}</span>
                  </button>

                  {/* Can Add Purchase */}
                  <button
                    disabled={!isAdmin}
                    onClick={() => handleToggleUserPermission(u, 'canAddPurchase')}
                    className={`p-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      u.permissions?.canAddPurchase
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}
                  >
                    <Check size={13} />
                    <span>Add Purchase: {u.permissions?.canAddPurchase ? 'YES' : 'NO'}</span>
                  </button>

                  {/* Can View Reports */}
                  <button
                    disabled={!isAdmin}
                    onClick={() => handleToggleUserPermission(u, 'canViewReports')}
                    className={`p-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      u.permissions?.canViewReports
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}
                  >
                    <Shield size={13} />
                    <span>Reports &amp; P&amp;L: {u.permissions?.canViewReports ? 'YES' : 'NO'}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <BottomSheet
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Create New Staff / User Account"
        subtitle="Set login details and choose what information this user can view or edit"
      >
        <div className="space-y-4 pb-4">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {formError}
            </div>
          )}

          {/* User Name & Email */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Aslam Staff"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:bg-white focus:border-zinc-900 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Login Email *
              </label>
              <input
                type="email"
                placeholder="e.g. aslam@sanzaristore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:bg-white focus:border-zinc-900 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleChange('Staff')}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    role === 'Staff'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                  }`}
                >
                  Staff Member
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('Admin')}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    role === 'Admin'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                  }`}
                >
                  Store Admin
                </button>
              </div>
            </div>
          </div>

          {/* Granular Permissions Section */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2">
            <label className="text-xs font-bold text-zinc-900 uppercase tracking-wider block">
              Access &amp; Privacy Controls
            </label>

            <div className="space-y-2 pt-1">
              {/* Can view cost price */}
              <label
                onClick={() => togglePermission('canViewCostPrice')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold cursor-pointer"
              >
                <div>
                  <span className="text-zinc-900">Show Cost Price ("Kitne me aata hai")</span>
                  <p className="text-[10px] text-zinc-500 font-normal">
                    If disabled, purchase costs and profit margins are hidden with ***
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.canViewCostPrice}
                  onChange={() => {}}
                  className="w-4 h-4 rounded-md text-zinc-900 focus:ring-0"
                />
              </label>

              {/* Can view wallet balances */}
              <label
                onClick={() => togglePermission('canViewWalletBalances')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold cursor-pointer"
              >
                <div>
                  <span className="text-zinc-900">Show Total Wallet Balances</span>
                  <p className="text-[10px] text-zinc-500 font-normal">
                    If disabled, cash balances and total business net worth are hidden
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.canViewWalletBalances}
                  onChange={() => {}}
                  className="w-4 h-4 rounded-md text-zinc-900 focus:ring-0"
                />
              </label>

              {/* Can add sales */}
              <label
                onClick={() => togglePermission('canAddSale')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold cursor-pointer"
              >
                <span className="text-zinc-900">Allow Adding Sales</span>
                <input
                  type="checkbox"
                  checked={permissions.canAddSale}
                  onChange={() => {}}
                  className="w-4 h-4 rounded-md text-zinc-900 focus:ring-0"
                />
              </label>

              {/* Can add purchases */}
              <label
                onClick={() => togglePermission('canAddPurchase')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold cursor-pointer"
              >
                <span className="text-zinc-900">Allow Adding Purchases</span>
                <input
                  type="checkbox"
                  checked={permissions.canAddPurchase}
                  onChange={() => {}}
                  className="w-4 h-4 rounded-md text-zinc-900 focus:ring-0"
                />
              </label>

              {/* Can view reports */}
              <label
                onClick={() => togglePermission('canViewReports')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold cursor-pointer"
              >
                <span className="text-zinc-900">Allow Access to Reports &amp; P&amp;L</span>
                <input
                  type="checkbox"
                  checked={permissions.canViewReports}
                  onChange={() => {}}
                  className="w-4 h-4 rounded-md text-zinc-900 focus:ring-0"
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSaveUser}
            className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-xl transition-transform active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <Check size={16} />
            <span>{isSubmitting ? 'Creating Account...' : 'CREATE USER & SAVE PERMISSIONS'}</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
