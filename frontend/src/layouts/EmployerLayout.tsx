import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CalendarRange,
  Layers,
  Camera,
  Brain,
  AlertTriangle,
  FileText,
  History,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Boxes,
  CheckCircle,
  Building2,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export function EmployerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);

  // Load project list and notifications ONCE on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const projList = (await api.getProjects()) as any[];
        setProjects(projList || []);

        const match = location.pathname.match(/\/projects\/([^\/]+)/);
        const urlProjId = match ? match[1] : null;
        const storedActiveId = localStorage.getItem('siteflow_active_project_id');
        const targetId = urlProjId || storedActiveId;

        if (targetId && projList && projList.length > 0) {
          const currentProj = projList.find(
            p => p.id === targetId || p.code === targetId || p.id?.toString() === targetId
          );
          if (currentProj) {
            setSelectedProject(currentProj);
            localStorage.setItem('siteflow_active_project_id', currentProj.id);
          } else {
            setSelectedProject(projList[0]);
            localStorage.setItem('siteflow_active_project_id', projList[0].id);
          }
        } else if (projList && projList.length > 0) {
          setSelectedProject(projList[0]);
          localStorage.setItem('siteflow_active_project_id', projList[0].id);
        } else {
          setSelectedProject(null);
        }

        const notifs = (await api.getNotifications()) as any[];
        setNotifications(notifs || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadInitialData();

    // Auto-poll notifications every 4s so real-time progress updates appear dynamically
    const pollInterval = setInterval(async () => {
      try {
        const notifs = (await api.getNotifications()) as any[];
        if (Array.isArray(notifs)) {
          setNotifications(notifs);
        }
      } catch (err) {}
    }, 4000);

    return () => clearInterval(pollInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync selectedProject when navigating to a /projects/:id route
  useEffect(() => {
    const match = location.pathname.match(/\/projects\/([^\/]+)/);
    if (match && projects.length > 0) {
      const urlProjId = match[1];
      const matchedProj = projects.find(
        p => p.id === urlProjId || p.code === urlProjId || p.id?.toString() === urlProjId
      );
      if (matchedProj && matchedProj.id !== selectedProject?.id) {
        setSelectedProject(matchedProj);
        localStorage.setItem('siteflow_active_project_id', matchedProj.id);
      }
    }
  }, [location.pathname, projects]);

  const userName = user?.name || 'Employer';
  const userDesignation = user?.designation || 'Senior Project Director';
  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'EP';

  const unreadCount = notifications.filter(n => n.unread).length;

  const navItems = [
    { label: 'Overview', path: '/employer/dashboard', icon: LayoutDashboard },
    { label: 'Projects', path: '/employer/projects', icon: FolderKanban },
    { label: 'Schedule / WBS', path: '/employer/schedule', icon: CalendarRange },
    { label: 'L5/L6 Activities', path: '/employer/activities', icon: Layers },
    { label: 'Site Images & Analysis', path: '/employer/site-images', icon: Camera },
    { label: 'Smart Insights', path: '/employer/ai-insights', icon: Brain },
    { label: 'Risks & Delays', path: '/employer/risks', icon: AlertTriangle },
    { label: 'Reports', path: '/employer/reports', icon: FileText },
    { label: 'Project History', path: '/employer/history', icon: History },
    { label: 'Settings', path: '/employer/settings', icon: Settings },
  ];

  const handleNotificationClick = async (targetRoute?: string, notifId?: string) => {
    if (notifId) {
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, unread: false } : n));
      try {
        await api.markNotificationRead(notifId);
      } catch (e) {}
    }
    setNotificationsOpen(false);
    if (targetRoute) navigate(targetRoute);
  };

  const handleClearAll = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    try {
      await api.markAllNotificationsRead();
    } catch (e) {}
  };

  const filteredSearchResults: any[] = [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Desktop Sidebar Navigation (Enterprise Compact Light Theme) */}
      <aside className="hidden lg:flex w-64 bg-white text-slate-800 flex-col justify-between fixed top-0 bottom-0 left-0 z-40 border-r border-slate-200">
        <div>
          {/* Branding Header */}
          <div className="h-16 px-5 flex items-center border-b border-slate-100">
            <Link to="/employer/dashboard" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-2xs">
                <Boxes className="w-4 h-4 text-amber-300" />
              </div>
              <span className="text-base font-extrabold text-slate-900 tracking-tight">
                InfraSync<span className="text-blue-600">Pro</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Project Control
            </div>
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border-l-3 border-blue-600'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 font-medium'
                  }`}
                >
                  <IconComp className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Footer */}
        <div className="p-3 border-t border-slate-100 space-y-1.5 bg-slate-50/50">
          <button
            onClick={() => navigate('/role-selection')}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span>Switch Role</span>
          </button>
          <div className="flex items-center space-x-2.5 px-2.5 py-1 text-xs text-slate-700">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shadow-2xs">
              {userInitials}
            </div>
            <div className="truncate">
              <p className="font-semibold text-slate-900 text-xs truncate">{userName}</p>
              <p className="text-[10px] text-slate-500 truncate">{userDesignation}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Navigation (Slide-over overlay for smartphones) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative bg-white text-slate-800 w-72 max-w-[85vw] flex flex-col justify-between p-4 z-10 border-r border-slate-200 shadow-2xl h-full">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 flex-shrink-0">
                <Link to="/employer/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Boxes className="w-4 h-4 text-amber-300" />
                  </div>
                  <span className="text-base font-extrabold text-slate-900">InfraSync</span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User badge inside mobile menu */}
              <div className="mb-3 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center space-x-3 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  {userInitials}
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 text-xs truncate">{userName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{userDesignation}</div>
                </div>
              </div>

              <nav className="space-y-1 overflow-y-auto flex-1 pr-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                  Employer Navigation
                </div>
                {navItems.map((item) => {
                  const IconComp = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <IconComp className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-100 flex-shrink-0 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/role-selection');
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                <span>Switch to Worker View</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 w-full">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Active Project Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-all shadow-2xs max-w-[180px] sm:max-w-xs truncate"
              >
                <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="hidden sm:inline truncate">
                  {selectedProject ? selectedProject.name : 'Select Project'}
                </span>
                <span className="sm:hidden font-mono truncate">
                  {selectedProject ? selectedProject.code : 'Project'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              </button>

              {projectDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                    Select Active Project
                  </div>
                  {projects.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500 italic">No projects created yet</div>
                  ) : (
                    projects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          setSelectedProject(proj);
                          localStorage.setItem('siteflow_active_project_id', proj.id);
                          setProjectDropdownOpen(false);
                          window.dispatchEvent(new CustomEvent('siteflow_project_changed', { detail: proj.id }));
                          if (location.pathname.startsWith('/employer/projects/')) {
                            navigate(`/employer/projects/${proj.id}`);
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          selectedProject?.id === proj.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-bold truncate">{proj.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{proj.code}</div>
                        </div>
                        {selectedProject?.id === proj.id && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-xs transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search activities...</span>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 relative transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Notifications ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="text-[11px] text-blue-600 font-bold hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 font-medium">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const progMatch = (notif.title || '').match(/(\d+(?:\.\d+)?%)/) || (notif.message || '').match(/(\d+(?:\.\d+)?%)/);
                        const shortProgress = progMatch ? progMatch[1] : null;
                        const timeStr = notif.timestamp || (notif.created_at ? notif.created_at.slice(11, 16) : '');

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif.targetRoute || notif.target_route, notif.id)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all hover:scale-[1.01] ${
                              notif.unread
                                ? 'bg-blue-50/70 border-blue-200 text-slate-800 shadow-2xs'
                                : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                              <div className="flex items-center space-x-1.5 truncate pr-2">
                                {shortProgress && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
                                    {shortProgress}
                                  </span>
                                )}
                                <span className="truncate">{notif.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap flex-shrink-0">
                                {timeStr}
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-600 line-clamp-2">{notif.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Area with Mobile Horizontal Overflow Control */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Global Search Modal Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center space-x-3">
              <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search L5/L6 activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm font-medium text-slate-800 outline-none"
              />
              <button onClick={() => setSearchOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto text-xs">
              {searchQuery.trim() === '' ? (
                <div className="text-center py-6 text-slate-400 font-medium">
                  Search by activity code, description, or L5 package...
                </div>
              ) : filteredSearchResults.length > 0 ? (
                <div className="space-y-2">
                  {filteredSearchResults.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => {
                        setSearchOpen(false);
                        navigate(`/employer/activities/${act.activityId}`);
                      }}
                      className="p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {act.name} <span className="text-blue-600 font-mono">({act.activityId})</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">{act.l5Name} → {act.l6Name}</div>
                      </div>
                      <span className="font-bold text-blue-600">{act.actualProgress}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  No matching line items found for "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
