import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BottomSheet } from './BottomSheet';
import {
  User,
  ShieldCheck,
  UserCheck,
  LogOut,
  Share2,
  Check,
  Sparkles,
  ArrowRightLeft,
  X,
} from 'lucide-react';

interface ProfileModalCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModalCard: React.FC<ProfileModalCardProps> = ({ isOpen, onClose }) => {
  const {
    currentUserProfile,
    allRegisteredUsers,
    switchUserAccount,
    logout,
  } = useAuth();

  const [copied, setCopied] = React.useState(false);

  const handleSharePublic = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'public');
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Default partner accounts if not in registered list
  const defaultAccounts = [
    {
      uid: 'admin-sahil-sanzari',
      email: 'sahil@sanzari.com',
      name: 'Sahil (Main Admin)',
      role: 'Admin' as const,
      permissions: {
        canAddSale: true,
        canAddPurchase: true,
        canAddExpense: true,
        canViewCostPrice: true,
        canViewWalletBalances: true,
        canViewReports: true,
        canManageUsers: true,
      },
    },
    {
      uid: 'partner-rizwan',
      email: 'rizwan@sanzari.com',
      name: 'Rizwan (Partner)',
      role: 'Admin' as const,
      permissions: {
        canAddSale: true,
        canAddPurchase: true,
        canAddExpense: true,
        canViewCostPrice: true,
        canViewWalletBalances: true,
        canViewReports: true,
        canManageUsers: true,
      },
    },
    {
      uid: 'partner-avesh',
      email: 'avesh@sanzari.com',
      name: 'Avesh (Partner)',
      role: 'Admin' as const,
      permissions: {
        canAddSale: true,
        canAddPurchase: true,
        canAddExpense: true,
        canViewCostPrice: true,
        canViewWalletBalances: true,
        canViewReports: true,
        canManageUsers: true,
      },
    },
    {
      uid: 'staff-sales',
      email: 'staff@sanzari.com',
      name: 'Store Staff (Counter)',
      role: 'Staff' as const,
      permissions: {
        canAddSale: true,
        canAddPurchase: true,
        canAddExpense: false,
        canViewCostPrice: false,
        canViewWalletBalances: false,
        canViewReports: false,
        canManageUsers: false,
      },
    },
  ];

  // Combine registered users with defaults
  const userList = allRegisteredUsers.length > 0 ? allRegisteredUsers : defaultAccounts;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="User Profile & Account Switch">
      <div className="space-y-5 pb-4">
        {/* Active Account Banner */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-violet-950 via-zinc-900 to-zinc-950 text-white shadow-xl flex items-center justify-between border border-violet-800/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white font-black text-xl flex items-center justify-center shadow-md">
              {currentUserProfile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                {currentUserProfile.name}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.2 rounded-full">
                  ACTIVE
                </span>
              </h3>
              <p className="text-xs text-violet-300 font-medium">{currentUserProfile.role}</p>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{currentUserProfile.email}</p>
            </div>
          </div>
        </div>

        {/* Switch Account Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowRightLeft size={14} className="text-violet-600" />
            <span>Switch User / Partner Account</span>
          </label>

          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-0.5">
            {userList.map((usr) => {
              const isActive =
                currentUserProfile.name.toLowerCase().includes(usr.name.toLowerCase()) ||
                currentUserProfile.email.toLowerCase() === usr.email.toLowerCase();

              return (
                <button
                  key={usr.uid || usr.email}
                  type="button"
                  onClick={() => {
                    switchUserAccount(usr);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'bg-violet-50 border-violet-300 text-violet-950 font-bold shadow-2xs'
                      : 'bg-white hover:bg-zinc-50 border-zinc-200/80 text-zinc-800 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center ${
                        isActive ? 'bg-violet-600 text-white' : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {usr.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-950">{usr.name}</p>
                      <p className="text-[10px] text-zinc-500">{usr.role} • {usr.email}</p>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-600 text-white flex items-center gap-1">
                      <UserCheck size={12} />
                      Current
                    </span>
                  ) : (
                    <span className="text-xs text-violet-600 font-bold hover:underline">Switch →</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 pt-1 border-t border-zinc-200">
          <button
            type="button"
            onClick={handleSharePublic}
            className="w-full p-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-bold flex items-center justify-between cursor-pointer active:scale-98 transition-transform"
          >
            <div className="flex items-center gap-2">
              <Share2 size={16} className="text-emerald-600" />
              <span>Share Public Store Status Link</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700">
              {copied ? 'Copied!' : 'Copy Link'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-transform"
          >
            <LogOut size={16} />
            <span>Lock App &amp; Logout</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
