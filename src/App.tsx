// App.tsx
import React, { useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { socket } from './socket';
import { UserProvider } from './contexts/UserContext';
import ErrorBoundary from './components/ErrorBoundary';
import { invalidateBoardCache } from './utils/boardCache';
import Login from './pages/Login/Login';
import CodeGymLogin from './pages/Login/CodeGymLogin';
import MaintenanceGuard from './components/MaintenanceGuard';

import Dashboard from './pages/DashBoard/Dashboard';
import BoardMembersPage from './pages/Board/BoardMembersPage';
import DashboardHome from './pages/DashBoard/DashboardHome';
import Introduction from './pages/Introduction/Introduction';
import Landing from './pages/Landing/Landing';
import Projects from './pages/Project/Projects';
import Groups from './pages/Group/Groups';
import MaintenancePage from './pages/MaintenancePage';
import Reports from './pages/Reports/Reports';
import ActivityLogs from './pages/Reports/ActivityLogs';
import Settings from './pages/Settings/Settings';
import GoogleCalendarCallback from './pages/Settings/GoogleCalendarCallback';
import UserProfilePage from './pages/User/UserProfilePage';
import UserManagement from './pages/Admin/UserManagement';
import RoleAndPermission from './pages/Admin/RoleAndPermission';
import UserPermissions from './pages/Admin/UserPermissions';
import PermissionManagement from './pages/Admin/PermissionManagement';
import Admin from './pages/Admin/Admin';
import AdminHome from './pages/Admin/AdminHome';
import BoardDetail from './pages/Board/BoardDetail';
import BoardSettings from './pages/Board/BoardSettings';
import RolePermissionEdit from './pages/Admin/RolePermissionEdit';
import TemplateManagement from './pages/Template/TemplateManagement';
import CenterManagement from './pages/Center/CenterManagement';
import CenterMembers from './pages/Center/CenterMembersPage';
import CenterMemberBoards from './pages/Center/CenterMemberBoards';
import UserPointsManagement from './pages/Admin/UserPointsManagement';
import BoardMember from './pages/Board/BoardMember';
import HelpButton from './components/HelpButton/HelpButton';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PAGE_PERMISSIONS } from './config/permissions';
import ActivityTask from './pages/Reports/ActivityTask';
import LogByUser from './pages/Reports/LogByUser';
import Throughput from './pages/Analytics/Throughput';
import TeacherEstimations from './pages/Analytics/TeacherEstimations';
import TeacherThroughput from './pages/Analytics/TeacherThroughput';
import Completion from './pages/Analytics/Completion';
import Gamification from './pages/Analytics/Gamification';
import CycleTime from './pages/Analytics/CycleTime';
import CentersPerformance from './pages/Analytics/CentersPerformance';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

import PointManagement from './pages/Analytics/PointManagement';
import BoardHealthScore from './pages/Analytics/BoardHealthScore';
import AtRiskTasks from './pages/Analytics/AtRiskTasks';
import WorkControl from './pages/QualityControl/WorkControl';
import LearningPath from './pages/Learning/LearningPath';
import AdaptiveGamification from './pages/Gamification/AdaptiveGamification';
import ScheduledReports from './pages/Reports/ScheduledReports';
import BacklogPage from './pages/Backlog/BacklogPage';

// Component để redirect /calendar callback về Settings
const CalendarCallbackRedirect: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  // Giữ lại query params (connected, syncEnabled, error, etc.)
  const queryString = searchParams.toString();
  const basePath = isAdmin ? '/admin' : '/dashboard';
  const redirectUrl = queryString
    ? `${basePath}/settings?tab=google&${queryString}`
    : `${basePath}/settings?tab=google`;

  return <Navigate to={redirectUrl} replace />;
};

const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  // Read roles array from localStorage (set by Login/AppWrapper)
  const rolesRaw = localStorage.getItem('roles');
  let roles: string[] = [];
  try {
    roles = rolesRaw ? JSON.parse(rolesRaw) : [];
  } catch {
    roles = [];
  }

  const allowedAdminRoles = ['admin', 'System_Manager'];
  const isAdmin = roles.some((role) => allowedAdminRoles.includes(role));

  useEffect(() => {
    if (!token) {
      // Không có token → redirect về login (trừ khi đã ở login)
      if (location.pathname !== '/login' && location.pathname !== '/login-codegym') {
        navigate('/login', { replace: true });
      }
    } else {
      // Có token và đang ở trang login → redirect về dashboard/admin
      if (location.pathname === '/login' || location.pathname === '/login-codegym') {
        navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
      }
      // KHÔNG redirect nếu đang ở các route hợp lệ khác
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Routes>
      <Route
        path="/admin/maintenance"
        element={
          <ProtectedAdminRoute allowedRoles={['System_Manager']}>
            <MaintenancePage />
          </ProtectedAdminRoute>
        }
      />

      <Route
        path="/"
        element={<Navigate to={token ? (isAdmin ? '/admin' : '/dashboard') : '/login'} replace />}
      />
      <Route path="/login" element={<Login />} />
      <Route path="/login-codegym" element={<CodeGymLogin />} />
      <Route path="/settings/google-calendar/callback" element={<GoogleCalendarCallback />} />

      {/* Redirect /calendar callback về Settings */}
      <Route
        path="/calendar"
        element={
          token ? <CalendarCallbackRedirect isAdmin={isAdmin} /> : <Navigate to="/login" replace />
        }
      />

      {/* Dashboard with nested routes */}
      <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardHome />} />
        <Route path="landing" element={<Landing />} />
        <Route path="introduction" element={<Introduction />} />
        <Route path="projects" element={<Projects />} />
        <Route path="groups" element={<Groups />} />
        <Route path="groups/:groupId" element={<Groups />} />

        <Route path="reports" element={<Reports />} />
        <Route path="analytics/throughput" element={<Throughput />} />
        <Route path="analytics/teacher-throughput" element={<TeacherThroughput />} />
        <Route path="analytics/estimations" element={<TeacherEstimations />} />
        <Route path="analytics/completion" element={<Completion />} />
        <Route path="analytics/gamification" element={<Gamification />} />
        <Route path="analytics/cycle-time" element={<CycleTime />} />
        <Route path="analytics/centers-performance" element={<CentersPerformance />} />
        <Route path="analytics/point-management" element={<PointManagement />} />
        <Route path="analytics/board-health-score" element={<BoardHealthScore />} />
        <Route path="analytics/at-risk" element={<AtRiskTasks />} />
        <Route path="work-control/*" element={<WorkControl />} />
        <Route path="learning-path" element={<LearningPath />} />
        <Route path="gamification" element={<AdaptiveGamification />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<UserProfilePage />} />
        <Route
          path="usermanagement"
          element={
            <ProtectedRoute requiredPermissions={PAGE_PERMISSIONS.USER_MANAGEMENT}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="usermanagement/:userId/permissions"
          element={
            <ProtectedRoute requiredPermissions={PAGE_PERMISSIONS.USER_MANAGEMENT}>
              <UserPermissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="roleandpermission"
          element={
            <ProtectedRoute requiredPermissions={PAGE_PERMISSIONS.ROLE_PERMISSION}>
              <RoleAndPermission />
            </ProtectedRoute>
          }
        />
        <Route
          path="permissionmanagement"
          element={
            <ProtectedRoute requiredPermissions={PAGE_PERMISSIONS.ROLE_PERMISSION}>
              <PermissionManagement />
            </ProtectedRoute>
          }
        />
        <Route path="templates" element={<TemplateManagement />} />
        <Route path="centers" element={<CenterManagement />} />
        <Route path="centers/:centerId/members" element={<CenterMembers />} />
        <Route path="userpoints" element={<UserPointsManagement />} />
        <Route path="boards/:id" element={<BoardDetail />} />
        <Route path="boards/:id/settings" element={<BoardSettings />} />
        <Route path="board/:id" element={<BoardDetail />} />
        <Route path="project/:id" element={<BoardDetail />} />
        <Route path="project/:id/:taskId" element={<BoardDetail />} />
        <Route path="project/:id/members" element={<BoardMembersPage />} />
        <Route path="backlog" element={<BacklogPage />} />
      </Route>

      {/* Admin with nested routes */}
      <Route
        path="/admin"
        element={token && isAdmin ? <Admin /> : <Navigate to="/login" replace />}
      >
        <Route index element={<AdminHome />} />
        <Route path="landing" element={<Landing />} />

        <Route path="introduction" element={<Introduction />} />
        <Route path="projects" element={<Projects />} />
        <Route path="groups" element={<Groups />} />
        <Route path="groups/:groupId" element={<Groups />} />

        <Route path="reports" element={<Reports />} />
        <Route path="analytics/throughput" element={<Throughput />} />
        <Route path="analytics/teacher-throughput" element={<TeacherThroughput />} />
        <Route path="analytics/estimations" element={<TeacherEstimations />} />
        <Route path="analytics/completion" element={<Completion />} />
        <Route path="analytics/gamification" element={<Gamification />} />
        <Route path="analytics/cycle-time" element={<CycleTime />} />
        <Route path="analytics/centers-performance" element={<CentersPerformance />} />
        <Route path="analytics/point-management" element={<PointManagement />} />
        <Route path="analytics/board-health-score" element={<BoardHealthScore />} />
        <Route path="analytics/at-risk" element={<AtRiskTasks />} />
        <Route path="work-control/*" element={<WorkControl />} />
        <Route path="reports/scheduled" element={<ScheduledReports />} />
        <Route path="learning-path" element={<LearningPath />} />
        <Route path="gamification" element={<AdaptiveGamification />} />
        <Route path="activity-logs" element={<ActivityLogs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<UserProfilePage />} />
        <Route
          path="usermanagement"
          element={
            <ProtectedRoute requiredPermissions={PAGE_PERMISSIONS.USER_MANAGEMENT}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="usermanagement/:userId/permissions"
          element={
            <ProtectedRoute requiredPermissions={PAGE_PERMISSIONS.USER_MANAGEMENT}>
              <UserPermissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="roleandpermission"
          element={
            <ProtectedRoute requiredPermissions={PAGE_PERMISSIONS.ROLE_PERMISSION}>
              <RoleAndPermission />
            </ProtectedRoute>
          }
        />
        <Route
          path="permissionmanagement"
          element={
            <ProtectedRoute requiredPermissions={PAGE_PERMISSIONS.ROLE_PERMISSION}>
              <PermissionManagement />
            </ProtectedRoute>
          }
        />
        <Route path="roles/:roleId/permissions" element={<RolePermissionEdit />} />
        <Route path="templates" element={<TemplateManagement />} />
        <Route path="centers" element={<CenterManagement />} />
        <Route path="centers/:centerId/members" element={<CenterMembers />} />
        <Route path="center/:centerId/members" element={<CenterMembers />} />
        <Route path="center/:centerId/member/:userId/boards" element={<CenterMemberBoards />} />
        <Route path="center/:centerId/members" element={<CenterMembers />} />
        <Route path="center/:centerId/member/:userId/boards" element={<CenterMemberBoards />} />
        <Route path="userpoints" element={<UserPointsManagement />} />
        <Route path="boards/:id" element={<BoardDetail />} />
        <Route path="boards/:id/settings" element={<BoardSettings />} />
        <Route path="board/:id" element={<BoardDetail />} />
        <Route path="project/:id" element={<BoardDetail />} />
        <Route path="project/:id/:taskId" element={<BoardDetail />} />
        <Route path="project/:id/history" element={<ActivityTask />} />
        <Route path="project/:id/members" element={<BoardMembersPage />} />
        <Route path="groups/:groupId/board/user/:userId" element={<BoardMember />} />
        <Route path="backlog" element={<BacklogPage />} />
      </Route>

      {/* Standalone routes for backward compatibility - redirect to dashboard/admin */}
      <Route
        path="/boards/:id"
        element={
          token ? (
            <Navigate
              to={
                isAdmin
                  ? `/admin/boards/${window.location.pathname.split('/')[2]}`
                  : `/dashboard/boards/${window.location.pathname.split('/')[2]}`
              }
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/board/:id"
        element={
          token ? (
            <Navigate
              to={
                isAdmin
                  ? `/admin/board/${window.location.pathname.split('/')[2]}`
                  : `/dashboard/board/${window.location.pathname.split('/')[2]}`
              }
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/project/:id"
        element={
          token ? (
            <Navigate
              to={
                isAdmin
                  ? `/admin/project/${window.location.pathname.split('/')[2]}`
                  : `/dashboard/project/${window.location.pathname.split('/')[2]}`
              }
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/project/:id/:taskId"
        element={
          token ? (
            <Navigate
              to={
                isAdmin
                  ? `/admin/project/${window.location.pathname.split('/')[2]}/${window.location.pathname.split('/')[3]
                  }`
                  : `/dashboard/project/${window.location.pathname.split('/')[2]
                  }/${window.location.pathname.split('/')[3]}`
              }
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="project/:id/history" element={<ActivityTask />} />
      <Route path="/user/logUser" element={<LogByUser />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    const registerIfPossible = () => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        socket.emit('register-user', userId);
      }
    };
    // Đăng ký khi connect
    socket.on('connect', registerIfPossible);
    // Đăng ký ngay nếu socket đã sẵn sàng (trường hợp refresh sau login)
    if (socket.connected) registerIfPossible();

    return () => {
      socket.off('connect', registerIfPossible);
      socket.off('new-member-added');
    };
  }, []);

  useEffect(() => {
    const handleBoardCreated = () => invalidateBoardCache();
    const handleBoardUpdated = () => invalidateBoardCache();
    const handleBoardDeleted = () => invalidateBoardCache();
    const handleBoardMemberAdded = () => invalidateBoardCache();
    const handleBoardMemberRemoved = () => invalidateBoardCache();

    socket.on('board_created', handleBoardCreated);
    socket.on('board_updated', handleBoardUpdated);
    socket.on('board_deleted', handleBoardDeleted);
    socket.on('board_member_added', handleBoardMemberAdded);
    socket.on('board_member_removed', handleBoardMemberRemoved);

    return () => {
      socket.off('board_created', handleBoardCreated);
      socket.off('board_updated', handleBoardUpdated);
      socket.off('board_deleted', handleBoardDeleted);
      socket.off('board_member_added', handleBoardMemberAdded);
      socket.off('board_member_removed', handleBoardMemberRemoved);
    };
  }, []);

  return (
    <ErrorBoundary>
      <UserProvider>
        <MaintenanceGuard>
          <AnimatedRoutes />
        </MaintenanceGuard>
        <Toaster
          position="bottom-right"
          reverseOrder={false}
          containerStyle={{
            bottom: '24px',
            right: '90px', // Tránh HelpButton
            zIndex: 10002,
          }}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--surface-card)',
              color: 'var(--text-primary)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 15px -3px var(--shadow-color), 0 4px 6px -2px var(--shadow-color)',
              minWidth: '320px',
              maxWidth: '420px',
              transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
              style: {
                border: '1px solid rgba(16,185,129,0.35)',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              style: {
                border: '1px solid rgba(239,68,68,0.35)',
              },
            },
          }}
        />
        <HelpButton />
      </UserProvider>
    </ErrorBoundary>
  );
}

export default App;
