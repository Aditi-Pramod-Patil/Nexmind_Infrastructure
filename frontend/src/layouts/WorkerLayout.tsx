import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  HardHat,
  LayoutDashboard,
  CheckSquare,
  Mic,
  History,
  LogOut,
  FolderKanban,
  ShieldCheck,
  Bell,
  Check,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export function WorkerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);

  const fetchProjectsAndNotifications = async () => {
    try {
      const projs = (await api.getProjects()) as any[];
      setProjects(projs || []);
      if (projs && projs.length > 0 && !selectedProjectId) {
        const storedActiveId = localStorage.getItem('siteflow_active_project_id');
        const target = projs.find(p => p.id === storedActiveId || p.code === storedActiveId) || projs[0];
        setSelectedProjectId(target.id);
      }

      const notifs = await api.getNotifications();
      setNotifications(notifs || []);
      const isUnread = (n: any) => Boolean(n.unread ?? !n.is_read);
      setUnreadCount((notifs || []).filter(isUnread).length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjectsAndNotifications();
    const interval = setInterval(fetchProjectsAndNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, unread: false, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (targetRoute?: string, notifId?: string) => {
    if (notifId) {
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, unread: false, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      try {
        await api.markNotificationRead(notifId);
      } catch (e) {}
    }
    setNotificationsOpen(false);
    if (targetRoute) navigate(targetRoute);
  };

  const workerFullName = user?.name || 'Worker';
  const workerDesignation = user?.designation || 'Field Engineer';
  const activeProject = projects.find(p => p.id === selectedProjectId) || (projects.length > 0 ? projects[0] : null);

  const tabs = [
    { label: 'Today Tasks', path: '/worker/dashboard', icon: LayoutDashboard },
    { label: 'Activities', path: '/worker/activities', icon: CheckSquare },
    { label: 'Report Progress', path: '/worker/report', icon: Mic },
    { label: 'Submission History', path: '/worker/history', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Top Header Navigation (Clean Single-Row Alignment) */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Brand Logo & Active Project Selector */}
            <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
              <div
                className="flex items-center space-x-2.5 cursor-pointer"
                onClick={() => navigate('/worker/dashboard')}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-2xs flex-shrink-0">
                  <HardHat className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold text-slate-900 tracking-tight whitespace-nowrap">InfraSync Field</span>
                  <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-md uppercase whitespace-nowrap">
                    Worker Portal
                  </span>
                </div>
              </div>

              {/* Active Project Switcher */}
              {projects.length > 0 && (
                <div className="hidden md:flex items-center space-x-2 pl-3 border-l border-slate-200">
                  <FolderKanban className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedProjectId(newId);
                      localStorage.setItem('siteflow_active_project_id', newId);
                      window.dispatchEvent(new CustomEvent('siteflow_project_changed', { detail: newId }));
                    }}
                    className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 py-1.5 px-3 rounded-xl outline-none shadow-2xs cursor-pointer max-w-[220px] truncate"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = location.pathname === tab.path;
                return (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-blue-600 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Right Actions: User Badge, Notifications, Role Switch, Logout */}
            <div className="flex items-center space-x-2.5 flex-shrink-0">
              {/* User Profile Badge */}
              <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span className="truncate max-w-[140px]">{workerFullName}</span>
              </div>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-4 space-y-3 font-sans">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-extrabold text-slate-900">Notifications ({notifications.length})</span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 font-medium">
                        No notifications yet.
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
                        {notifications.map((n: any) => {
                          const progMatch = (n.title || '').match(/(\d+(?:\.\d+)?%)/) || (n.message || '').match(/(\d+(?:\.\d+)?%)/);
                          const shortProgress = progMatch ? progMatch[1] : null;
                          const isUnread = Boolean(n.unread ?? !n.is_read);
                          const timeStr = n.timestamp || (n.created_at ? n.created_at.slice(11, 16) : '');

                          return (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n.target_route || n.targetRoute, n.id)}
                              className={`p-3 rounded-xl border text-xs space-y-1 transition-all cursor-pointer hover:scale-[1.01] ${
                                isUnread ? 'bg-blue-50/70 border-blue-200 shadow-2xs' : 'bg-slate-50 border-slate-200/80'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold text-slate-900">
                                <div className="flex items-center space-x-1.5 truncate pr-2">
                                  {shortProgress && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
                                      {shortProgress}
                                    </span>
                                  )}
                                  <span className="truncate">{n.title}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap flex-shrink-0">
                                  {timeStr}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] line-clamp-2">{n.message}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Role Switch button */}
              <button
                onClick={() => navigate('/role-selection')}
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors whitespace-nowrap"
              >
                Role Switch
              </button>

              {/* Log Out */}
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs flex items-center space-x-1.5 font-bold transition-colors whitespace-nowrap"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Active Project Banner Bar */}
        <div className="lg:hidden bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700 font-medium">
          <div className="flex items-center space-x-2 truncate">
            <FolderKanban className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="truncate font-semibold text-slate-800">
              {activeProject ? activeProject.name : 'No project assigned'}
            </span>
          </div>
          {activeProject && (
            <span className="text-[10px] font-mono bg-blue-100/80 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md font-bold flex-shrink-0">
              {activeProject.code}
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-12">
        <Outlet />
      </main>

      {/* Mobile Bottom Touch Navigation Bar (Shown on sm/md, Hidden on LG desktop) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-3 py-2 flex items-center justify-around shadow-lg pb-safe">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-blue-600 font-bold bg-blue-50 scale-105'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
