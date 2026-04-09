// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useKeycloak';
import { logoutApi } from '../../api/authApi';
import NotificationBell from '../../components/NotificationBell';
import UserMenu from '../../components/UserMenu';
import Sidebar from '../../components/Sidebar';
import { useUser } from '../../contexts/UserContext';
// socket not used in this header file
import { usePermissions } from '../../hooks/usePermissions';
import { PAGE_PERMISSIONS } from '../../config/permissions';
import { fetchMyBoards } from '../../api/boardApi';
import { getBasicSidebarConfig, BasicSidebarConfig } from '../../api/sidebarApi';
import { getAllCenters } from '../../api/centerApi';

// Helper function to map dashboard path to admin path (for backend lookup)
const mapDashboardPathToAdmin = (dashboardPath: string): string => {
  return dashboardPath.replace('/dashboard', '/admin');
};

const Dashboard = () => {
  const { logout, username } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { userAvatar } = useUser();
  const email = localStorage.getItem('email') || username || 'user';

  // ✅ Sử dụng hook permissions
  const { hasAnyPermission, loading: permissionsLoading } = usePermissions();

  // Avatar is now managed by UserContext - no need to fetch here

  // 🚪 Đăng xuất
  const handleLogout = async () => {
    const typeLogin = localStorage.getItem('Type_login');
    if (typeLogin === 'SSO') {
      logout();
    } else {
      const token = localStorage.getItem('token');
      if (token) await logoutApi();
      localStorage.clear();
      navigate('/login');
    }
  };

  // Projects count for badge
  const [projectsCount, setProjectsCount] = useState<number | undefined>(undefined);
  const [boards, setBoards] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchMyBoards();
        const data = res?.data;
        let count = 0;
        if (Array.isArray(data)) count = data.length;
        else if (res?.pagination?.total) count = res.pagination.total;
        else if (data) count = 1;
        setProjectsCount(count > 0 ? count : undefined);

        const boardsList = Array.isArray(data) ? data : data ? [data] : [];
        setBoards(boardsList);
        if (boardsList.length > 0 && !selectedBoardId) {
          setSelectedBoardId(boardsList[0]._id || boardsList[0].id || '');
        }
      } catch {
        setProjectsCount(undefined);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadCenters = async () => {
      try {
        const res = await getAllCenters();
        const list = res?.data || res || [];
        setCenters(Array.isArray(list) ? list : []);
        if (Array.isArray(list) && list.length > 0 && !selectedCenterId) {
          setSelectedCenterId(list[0]._id || list[0].id || '');
        }
      } catch (e) {
        console.error('Failed to load centers', e);
      }
    };
    loadCenters();
  }, []);

  // 🎨 Menu
  const roles = JSON.parse(localStorage.getItem('roles') || '[]');
  const isAdminOrManager = roles.includes('admin') || roles.includes('System_Manager');

  const canViewCenters =
    !permissionsLoading && hasAnyPermission(PAGE_PERMISSIONS.CENTER_ADMIN_ONLY);

  const [mainMenu, setMainMenu] = useState([
    { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { name: 'Projects', icon: 'projects', path: '/dashboard/projects', badge: projectsCount },
    { name: 'Backlog', icon: 'reports', iconUrl: '/icons/scrum.png', path: '/dashboard/backlog' },
    { name: 'Reports', icon: 'reports', path: '/dashboard/reports' },
    // Only show analytics to admins/managers
    ...(isAdminOrManager
      ? [
          {
            name: 'Analytic',
            icon: 'reports',
            path: '/dashboard/analytics/throughput',
            submenu: [
              { name: 'Throughput', icon: 'reports', path: '/dashboard/analytics/throughput' },
              {
                name: 'Teacher Throughput',
                icon: 'reports',
                path: '/dashboard/analytics/teacher-throughput',
              },
              { name: 'Estimations', icon: 'reports', path: '/dashboard/analytics/estimations' },
              { name: 'Gamification', icon: 'reports', path: '/dashboard/analytics/gamification' },
              {
                name: 'Point Management',
                icon: 'reports',
                path: '/dashboard/analytics/point-management',
              },
              {
                name: 'Board Health Score',
                icon: 'reports',
                path: '/dashboard/analytics/board-health-score',
              },
            ],
          },
        ]
      : []),
    { name: 'Groups', icon: 'groups', path: '/dashboard/groups' },
    { name: 'Templates', icon: 'templates', path: '/dashboard/templates' },
    // Chỉ hiển thị Centers khi có quyền
    ...(canViewCenters ? [{ name: 'Centers', icon: 'center', path: '/dashboard/centers' }] : []),
    // Chỉ hiển thị UserPoints cho admin và System_Manager
    ...(isAdminOrManager
      ? [{ name: 'UserPoints', icon: 'point', path: '/dashboard/userpoints' }]
      : []),
  ]);

  const [personalMenu, setPersonalMenu] = useState([
    { name: 'Profile', icon: 'Profile', path: '/dashboard/profile' },
    { name: 'Learning Path', icon: 'learning', path: '/dashboard/learning-path' },
    { name: 'Settings', icon: 'Settings', path: '/dashboard/settings' },
  ]);

  // ✅ Admin menu - filter theo permissions
  const allAdminMenuItems = [
    {
      name: 'UserManagement',
      icon: 'UserManagement',
      path: '/dashboard/usermanagement',
      requiredPermissions: PAGE_PERMISSIONS.USER_MANAGEMENT,
    },
    {
      name: 'RoleAndPermission',
      icon: 'RoleAndPermission',
      path: '/dashboard/roleandpermission',
      requiredPermissions: PAGE_PERMISSIONS.ROLE_PERMISSION,
    },
    {
      name: 'PermissionManagement',
      icon: 'RoleAndPermission',
      path: '/dashboard/permissionmanagement',
      requiredPermissions: PAGE_PERMISSIONS.ROLE_PERMISSION,
    },
  ];

  // Filter menu theo permissions (chỉ hiển thị khi không loading)
  const [adminMenu, setAdminMenu] = useState(
    permissionsLoading
      ? []
      : allAdminMenuItems.filter((item) => hasAnyPermission(item.requiredPermissions)),
  );

  // Load sidebar config from backend
  useEffect(() => {
    // Wait for permissions to load before loading sidebar config
    if (permissionsLoading) return;

    const loadSidebarConfig = async () => {
      try {
        const configs = await getBasicSidebarConfig();
        if (!configs || configs.length === 0) {
          return;
        }
        const menuMap = new Map(configs.map((c) => [c.path, c]));

        // Update main menu with backend config
        setMainMenu((prev) => {
          const updated = prev.map((item) => {
            // Map dashboard path to admin path for backend lookup
            const adminPath = mapDashboardPathToAdmin(item.path);
            const backendConfig = menuMap.get(adminPath);
            if (backendConfig) {
              return {
                ...item,
                name: backendConfig.name,
                icon: backendConfig.icon,
                iconUrl: backendConfig.iconUrl || null,
                badge: item.path === '/dashboard/projects' ? projectsCount : undefined,
              };
            }
            return {
              ...item,
              badge: item.path === '/dashboard/projects' ? projectsCount : undefined,
            };
          });
          return updated;
        });

        // Update personal menu
        setPersonalMenu((prev) =>
          prev.map((item) => {
            const adminPath = mapDashboardPathToAdmin(item.path);
            const backendConfig = menuMap.get(adminPath);
            if (backendConfig) {
              return {
                ...item,
                name: backendConfig.name,
                icon: backendConfig.icon,
                iconUrl: backendConfig.iconUrl || null,
              };
            }
            return item;
          }),
        );

        // Update admin menu - filter first, then apply config
        const filteredAdminItems = [
          {
            name: 'UserManagement',
            icon: 'UserManagement',
            path: '/dashboard/usermanagement',
            requiredPermissions: PAGE_PERMISSIONS.USER_MANAGEMENT,
          },
          {
            name: 'RoleAndPermission',
            icon: 'RoleAndPermission',
            path: '/dashboard/roleandpermission',
            requiredPermissions: PAGE_PERMISSIONS.ROLE_PERMISSION,
          },
          {
            name: 'PermissionManagement',
            icon: 'RoleAndPermission',
            path: '/dashboard/permissionmanagement',
            requiredPermissions: PAGE_PERMISSIONS.ROLE_PERMISSION,
          },
        ].filter((item) => hasAnyPermission(item.requiredPermissions));

        setAdminMenu(
          filteredAdminItems.map((item) => {
            const adminPath = mapDashboardPathToAdmin(item.path);
            const backendConfig = menuMap.get(adminPath);
            if (backendConfig) {
              return {
                ...item,
                name: backendConfig.name,
                icon: backendConfig.icon,
                iconUrl: backendConfig.iconUrl || null,
              };
            }
            return item;
          }),
        );
      } catch (error: any) {
        console.error('Failed to load sidebar config:', error);
        // Keep default menu on error, but still update badge
        setMainMenu((prev) =>
          prev.map((item) => ({
            ...item,
            badge: item.path === '/dashboard/projects' ? projectsCount : undefined,
          })),
        );
      }
    };
    loadSidebarConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsLoading, projectsCount]);

  type MenuItem = { name: string; icon: string; path: string; badge?: number };

  const teams = [
    { id: '1', name: 'Heroicons', initial: 'H' },
    { id: '2', name: 'Tailwind Labs', initial: 'T' },
    { id: '3', name: 'Workcation', initial: 'W' },
  ];

  const analyticsShortcuts = useMemo(() => {
    if (!isAdminOrManager) return [];
    return [
      { label: 'Throughput', path: '/dashboard/analytics/throughput' },
      { label: 'Health', path: '/dashboard/analytics/board-health-score' },
      { label: 'Risk', path: '/dashboard/analytics/at-risk' },
      { label: 'Points', path: '/dashboard/analytics/point-management' },
    ];
  }, [isAdminOrManager]);

  const goAnalytics = (path: string) => {
    const params = new URLSearchParams();
    if (selectedBoardId) params.set('board', selectedBoardId);
    if (dateRange.start) params.set('start', dateRange.start);
    if (dateRange.end) params.set('end', dateRange.end);
    navigate(`${path}?${params.toString()}`);
  };

  const broadcastRefresh = () => {
    window.dispatchEvent(
      new CustomEvent('dashboard-analytics-refresh', {
        detail: {
          boardId: selectedBoardId,
          centerId: selectedCenterId,
          dateRange,
        },
      }),
    );
  };

  return (
    <div className="relative flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* Sidebar */}
      <Sidebar
        mainMenu={mainMenu}
        personalMenu={personalMenu}
        adminMenu={adminMenu}
        teams={teams}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-transparent text-gray-900 dark:text-slate-100">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between min-h-[56px]">
            {/* Left */}
            {location.pathname === '/dashboard' ? (
              <div className="text-sm font-medium text-gray-700 dark:text-slate-200">Dashboard</div>
            ) : (
              <div />
            )}

            {/* Right: actions + avatar */}
            <div className="flex items-center gap-4">
              <button className="text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              <NotificationBell />

              <UserMenu
                avatarUrl={userAvatar}
                email={email}
                onLogout={handleLogout}
                accent="gray"
              />
            </div>
          </div>

          {/* Header controls (dashboard only) */}
          {location.pathname === '/dashboard' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {analyticsShortcuts.map((item) => (
                <button
                  key={item.path}
                  onClick={() => goAnalytics(item.path)}
                  className="px-3 py-2 text-xs font-medium border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={broadcastRefresh}
                className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
              >
                Refresh data
              </button>
            </div>
          )}
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
