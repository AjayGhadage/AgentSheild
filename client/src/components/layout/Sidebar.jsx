import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield, Home, Search, Bot, Activity, AlertTriangle,
  Clock, FlaskConical, Settings, ChevronLeft, ChevronRight,
  CheckCircle, LogOut, User, Bell, BookOpen, Code2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV = [
  { to: '/',            label: 'Home',           icon: Home },
  { to: '/paper',       label: 'Paper Showcase', icon: BookOpen },
  { to: '/integration', label: 'Developer SDK',  icon: Code2 },
  { to: '/scan',        label: 'Security Check',  icon: Search },
  { to: '/sandbox',     label: 'Agent Sandbox',   icon: Bot },
  { to: '/actions',     label: 'Agent Actions',   icon: Activity },
  { to: '/incidents',   label: 'Incidents',       icon: AlertTriangle },
  { to: '/approvals',   label: 'Approvals',       icon: Bell },
  { to: '/history',     label: 'Audit History',   icon: Clock },
  { to: '/evaluation',  label: 'Evaluation Lab',  icon: FlaskConical },
  { to: '/policies',    label: 'Policies',        icon: CheckCircle },
  { to: '/settings',    label: 'Settings',        icon: Settings },
];

export default function Sidebar({ mobileOpen = false, onCloseMobile }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout }          = useAuth();
  const navigate                  = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col shrink-0 h-full bg-[#09090b] border-r border-white/5 transition-all duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0 shadow-2xl shadow-amber-950/40' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ width: collapsed ? 68 : 240 }}
      >
        {/* Logo / Clean Branding */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-600 shrink-0 shadow-md shadow-amber-500/20">
              <Shield size={16} className="text-slate-950" strokeWidth={2.8} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-white text-sm tracking-tight block truncate">
                  AgentShield AI
                </span>
                <span className="text-[10px] font-mono text-amber-400/90 block truncate font-medium">
                  Autonomous Gateway
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'
                }`
              }
            >
              <Icon size={16} className="shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* System Telemetry Status (No personal names) */}
        {!collapsed && (
          <div className="px-3 py-2.5 border-t border-white/5 bg-black/40">
            <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gateway Engine Active</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Oracle XE • SHA-256 Chained
            </div>
          </div>
        )}

        {/* User Info & Controls */}
        <div className="border-t border-white/5 p-2 space-y-1 bg-[#09090b]">
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <User size={13} className="text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-amber-400/90 font-mono capitalize">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
          >
            <LogOut size={15} className="shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden md:flex items-center gap-3 w-full px-3 py-1.5 rounded-xl text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
