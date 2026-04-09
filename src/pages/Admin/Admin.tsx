
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useKeycloak";
import { logoutApi } from "../../api/authApi";
import NotificationBell from "../../components/NotificationBell";
import UserMenu from "../../components/UserMenu";
import Sidebar from "../../components/Sidebar";
import { useUser } from "../../contexts/UserContext";
// socket not used in this header file
import { fetchMyBoards } from "../../api/boardApi";
import { getBasicSidebarConfig } from "../../api/sidebarApi";

const Admin: React.FC = () => {
  const { logout, username } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const analyticsTabs = useMemo(
    () => [
      { label: "Dashboard", path: "/admin" },
      { label: "Throughput", path: "/admin/analytics/throughput" },
      { label: "Health", path: "/admin/analytics/board-health-score" },
      { label: "Points", path: "/admin/analytics/point-management" },
      { label: "Risk", path: "/admin/analytics/at-risk" },
    ],
    []
  );
  const showAnalyticsTabs =
    location.pathname.startsWith("/admin/analytics") || location.pathname === "/admin";
  
  const { userAvatar } = useUser();
  const email = localStorage.getItem("email") || username || "admin";

  
  
  // roles not needed in Admin header

  // Avatar is now managed by UserContext - no need to fetch here


  // 🔹 Hàm đăng xuất
  const handleLogout = async () => {
    const typeLogin = localStorage.getItem("Type_login");
    if (typeLogin === "SSO") {
      logout();
    } else {
      const token = localStorage.getItem("token");
      if (token) {
        await logoutApi();
      }
      localStorage.clear();
      navigate("/login");
    }
  };

  // Projects count for badge
  const [projectsCount, setProjectsCount] = useState<number | undefined>(undefined);
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
      } catch {
        setProjectsCount(undefined);
      }
    };
    load();
  }, []);

  // Load sidebar config from backend
  type MenuItem = {
    name: string;
    icon: string;
    path: string;
    iconUrl?: string | null;
    badge?: number;
    submenu?: MenuItem[];
  };

  const [mainMenu, setMainMenu] = useState<MenuItem[]>([
    { name: "Dashboard", icon: "dashboard", path: "/admin" },
    { name: "Projects", icon: "projects", path: "/admin/projects" },
    { name: "Backlog", icon: "reports", iconUrl: "/icons/scrum.png", path: "/admin/backlog" },
    { name: "Reports", icon: "reports", path: "/admin/reports" },
    { name: "Groups", icon: "groups", path: "/admin/groups" },
  ]);

  useEffect(() => {
    const loadSidebarConfig = async () => {
      try {
        const configs = await getBasicSidebarConfig();
        const menuMap = new Map(configs.map((c) => [c.path, c]));
        
        // Update main menu with backend config while preserving menu order
        setMainMenu((prev) =>
          prev.map((item) => {
            const backendConfig = menuMap.get(item.path) as Partial<MenuItem> | undefined;
            if (backendConfig) {
              return {
                ...item,
                name: backendConfig.name || item.name,
                icon: backendConfig.icon || item.icon,
                iconUrl: backendConfig.iconUrl || item.iconUrl,
                badge: item.path === "/admin/projects" ? projectsCount : undefined,
              };
            }
            return {
              ...item,
              badge: item.path === "/admin/projects" ? projectsCount : undefined,
            };
          })
        );
      } catch (error) {
        console.error("Failed to load sidebar config:", error);
        // Keep default menu on error, but still update badge
        setMainMenu((prev) =>
          prev.map((item) => ({
            ...item,
            badge: item.path === "/admin/projects" ? projectsCount : undefined,
          }))
        );
      }
    };
    loadSidebarConfig();
  }, [projectsCount]);
  const [personalMenu, setPersonalMenu] = useState<MenuItem[]>([
    { name: "Profile", icon: "Profile", path: "/admin/profile" },
    { name: "Learning Path", icon: "learning", path: "/admin/learning-path" },
    { name: "Settings", icon: "Settings", path: "/admin/settings" },
  ]);

  const [adminMenu, setAdminMenu] = useState<MenuItem[]>([
    { name: "UserManagement", icon: "UserManagement", path: "/admin/usermanagement" },
    { name: "RoleAndPermission", icon: "RoleAndPermission", path: "/admin/roleandpermission" },
    { name: "PermissionManagement", icon: "RoleAndPermission", path: "/admin/permissionmanagement" },
    { name: "Templates", icon: "templates", path: "/admin/templates" },
    { name: "Centers", icon: "center", path: "/admin/centers" },
    { name: "UserPoints", icon: "point", path: "/admin/userpoints" },
  ]);

  // Update personal and admin menus with backend config
  useEffect(() => {
    const loadAllMenuConfigs = async () => {
      try {
        const configs = await getBasicSidebarConfig();
        const menuMap = new Map(configs.map((c) => [c.path, c]));

        // Update personal menu
        setPersonalMenu((prev) =>
          prev.map((item) => {
            const backendConfig = menuMap.get(item.path) as Partial<MenuItem> | undefined;
            if (backendConfig) {
              return {
                ...item,
                name: backendConfig.name || item.name,
                icon: backendConfig.icon || item.icon,
                iconUrl: backendConfig.iconUrl || item.iconUrl,
              };
            }
            return item;
          })
        );

        // Update admin menu
        setAdminMenu((prev) =>
          prev.map((item) => {
            const backendConfig = menuMap.get(item.path) as Partial<MenuItem> | undefined;
            if (backendConfig) {
              return {
                ...item,
                name: backendConfig.name || item.name,
                icon: backendConfig.icon || item.icon,
                iconUrl: backendConfig.iconUrl || item.iconUrl,
              };
            }
            return item;
          })
        );
      } catch (error) {
        console.error("Failed to load menu configs:", error);
      }
    };
    loadAllMenuConfigs();
  }, []);

  const teams = [
    { id: "1", name: "Admin Team", initial: "A" },
    { id: "2", name: "Management", initial: "M" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* Sidebar */}
      <Sidebar
        mainMenu={mainMenu}
        personalMenu={personalMenu}
        adminMenu={adminMenu}
        teams={teams}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden text-gray-900 dark:text-slate-100">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Admin Panel - System Management
            </div>

            <div className="flex items-center gap-4">
              <button className="text-gray-500 dark:text-slate-300 hover:text-gray-700 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <NotificationBell />

              {/* User section */}
              <UserMenu avatarUrl={userAvatar} email={email} onLogout={handleLogout} accent="red" />
            </div>
          </div>
          {showAnalyticsTabs && (
            <div className="mt-4 flex flex-wrap gap-4 border-b border-gray-200 dark:border-slate-800 pb-1">
              {analyticsTabs.map((tab) => {
                const active =
                  tab.path === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(tab.path);
                return (
                  <button
                    key={tab.path}
                    onClick={() => navigate(`${tab.path}${location.search || ""}`)}
                    className={`px-2 pb-2 text-sm font-medium border-b-2 transition-colors ${
                      active
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Admin;