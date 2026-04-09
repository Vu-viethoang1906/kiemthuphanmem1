import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { fetchMyBoards } from '../../api/boardApi';
import { fetchTasksByBoard } from '../../api/taskApi';
import { getMe } from '../../api/authApi';
import axiosInstance from '../../api/axiosInstance';
import { socket } from '../../socket';

const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [analyticsContext, setAnalyticsContext] = useState<{
    boardId?: string;
    centerId?: string;
    dateRange?: { start: string; end: string };
  }>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeBoards: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0,
    teamMembers: 0,
    pendingReviews: 0,
    overdueTasks: 0,
    completionRate: 0,
    tasksCreatedThisWeek: 0,
    tasksCompletedThisWeek: 0,
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [tasksByPriority, setTasksByPriority] = useState({
    high: 0,
    medium: 0,
    low: 0,
    none: 0,
  });
  const [tasksByStatus, setTasksByStatus] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const roles = JSON.parse(localStorage.getItem('roles') || '[]');
  const isAdminOrManager = roles.includes('admin') || roles.includes('System_Manager');

  // Helper: completion logic aligned with Reports
  const isTaskCompleted = useCallback((t: any) => {
    try {
      const col: any = t?.column || t?.column_id || t?.columnId || null;
      if (col && typeof col === 'object') {
        if (col.isDone === true || (col as any).isdone === true) return true;
        const name = (col.name || col.title || '').toString().toLowerCase();
        if (name.includes('done') || name.includes('hoàn thành')) return true;
      }
      const status = (t?.status || '').toString().toLowerCase();
      return (
        status.includes('done') ||
        status.includes('complete') ||
        status.includes('closed') ||
        status.includes('hoàn thành')
      );
    } catch {
      return false;
    }
  }, []);

  // Load real data from backend
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch my boards
        const boardsRes = await fetchMyBoards();

        // Parse boards correctly - fetchMyBoards already returns res.data
        let boards: any[] = [];
        if (boardsRes?.data) {
          boards = Array.isArray(boardsRes.data) ? boardsRes.data : [boardsRes.data];
        } else if (Array.isArray(boardsRes)) {
          boards = boardsRes;
        }

        const filteredBoards =
          selectedBoardId && boards.some((b) => (b._id || b.id) === selectedBoardId)
            ? boards.filter((b) => (b._id || b.id) === selectedBoardId)
            : boards;

        // Fetch tasks for all boards
        let allTasks: any[] = [];
        const boardsWithStats = await Promise.all(
          filteredBoards.map(async (board: any) => {
            try {
              const tasksRes = await fetchTasksByBoard(board._id || board.id);

              // Parse tasks correctly - fetchTasksByBoard already returns res.data
              let tasks = [];
              if (tasksRes?.data) {
                tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [tasksRes.data];
              } else if (Array.isArray(tasksRes)) {
                tasks = tasksRes;
              }

              allTasks = [...allTasks, ...tasks];

              // Calculate board stats using unified completion logic
              const completedTasks = tasks.filter((t: any) => isTaskCompleted(t)).length;
              const progress =
                tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

              return {
                id: board._id || board.id,
                name: board.title || board.name,
                progress,
                tasks: tasks.length,
                completed: completedTasks,
                status:
                  progress >= 80
                    ? 'Almost Done'
                    : progress >= 50
                      ? 'On Track'
                      : progress >= 30
                        ? 'In Progress'
                        : 'Behind',
                color:
                  progress >= 80
                    ? '#4CAF50'
                    : progress >= 50
                      ? '#2196F3'
                      : progress >= 30
                        ? '#FF9800'
                        : '#F44336',
              };
            } catch (error) {
              console.error(`Failed to load tasks for board ${board._id}:`, error);
              return {
                id: board._id || board.id,
                name: board.title || board.name,
                progress: 0,
                tasks: 0,
                completed: 0,
                status: 'No Data',
                color: '#9E9E9E',
              };
            }
          }),
        );

        // Calculate detailed stats
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const completedTasks = allTasks.filter((t: any) => isTaskCompleted(t));

        const inProgressTasks = allTasks.filter(
          (t: any) =>
            t.status === 'In Progress' || t.column?.name?.toLowerCase().includes('progress'),
        );

        const todoTasks = allTasks.filter(
          (t: any) =>
            t.status === 'To Do' ||
            t.status === 'Todo' ||
            t.column?.name?.toLowerCase().includes('todo') ||
            t.column?.name?.toLowerCase().includes('to do'),
        );

        const pendingReviews = allTasks.filter(
          (t: any) => t.status === 'Review' || t.column?.name?.toLowerCase().includes('review'),
        );

        const overdueTasks = allTasks.filter(
          (t: any) => t.due_date && new Date(t.due_date) < now && !completedTasks.includes(t),
        );

        const tasksCreatedThisWeek = allTasks.filter(
          (t: any) => new Date(t.created_at) >= oneWeekAgo,
        );

        const tasksCompletedThisWeek = completedTasks.filter(
          (t: any) => t.updated_at && new Date(t.updated_at) >= oneWeekAgo,
        );

        const completionRate =
          allTasks.length > 0
            ? Math.round((completedTasks.length / allTasks.length) * 1000) / 10
            : 0;

        // Calculate tasks by priority
        const priorityStats = {
          high: allTasks.filter((t: any) => t.priority?.toLowerCase() === 'high').length,
          medium: allTasks.filter((t: any) => t.priority?.toLowerCase() === 'medium').length,
          low: allTasks.filter((t: any) => t.priority?.toLowerCase() === 'low').length,
          none: allTasks.filter((t: any) => !t.priority).length,
        };

        // Get unique team members from all tasks
        const uniqueMembers = new Set();
        allTasks.forEach((t: any) => {
          if (t.created_by?._id) uniqueMembers.add(t.created_by._id);
          if (t.assigned_to) {
            if (Array.isArray(t.assigned_to)) {
              t.assigned_to.forEach((u: any) => uniqueMembers.add(u._id || u));
            } else {
              uniqueMembers.add(t.assigned_to._id || t.assigned_to);
            }
          }
        });

        // Calculate tasks by status/column
        const statusMap = new Map();
        allTasks.forEach((t: any) => {
          const status = t.column?.name || t.status || 'Unknown';
          statusMap.set(status, (statusMap.get(status) || 0) + 1);
        });
        const statusArray = Array.from(statusMap.entries()).map(([name, count]) => ({
          name,
          count,
        }));

        setStats({
          totalProjects: filteredBoards.length,
          activeBoards: filteredBoards.length,
          totalTasks: allTasks.length,
          completedTasks: completedTasks.length,
          inProgressTasks: inProgressTasks.length,
          todoTasks: todoTasks.length,
          teamMembers: uniqueMembers.size,
          pendingReviews: pendingReviews.length,
          overdueTasks: overdueTasks.length,
          completionRate,
          tasksCreatedThisWeek: tasksCreatedThisWeek.length,
          tasksCompletedThisWeek: tasksCompletedThisWeek.length,
        });

        setTasksByPriority(priorityStats);
        setTasksByStatus(statusArray);

        setProjects(boardsWithStats.slice(0, 4)); // Show top 4 projects

        // Keep placeholder activities empty; we'll render notifications below
        setRecentActivities([]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedBoardId]);

  // Listen for refresh broadcast from Dashboard header
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail || {};
      setAnalyticsContext(detail);
      if (detail?.boardId) {
        setSelectedBoardId(detail.boardId);
      } else {
        setSelectedBoardId(null);
      }
    };
    window.addEventListener('dashboard-analytics-refresh', handler);
    return () => window.removeEventListener('dashboard-analytics-refresh', handler);
  }, []);

  // Helper function to calculate time ago
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  // --- Inlined NotificationBell logic (prefixed with notif*) ---
  const notifWrapperRef = useRef<HTMLDivElement | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifItems, setNotifItems] = useState<any[]>([]);
  const [notifUnreadCount, setNotifUnreadCount] = useState<number>(0);
  const [notifActiveTab, setNotifActiveTab] = useState<'unread' | 'read'>('unread');
  const notifClickTimerRef = useRef<number | null>(null);

  const loadNotifications = async () => {
    try {
      setNotifLoading(true);
      const userId = localStorage.getItem('userId') || 'anonymous';
      const response = await axiosInstance.get(`/notification/${userId}`);
      const notifications = response.data?.data || [];

      const itemsBuilt = notifications.map((notif: any) => {
        const dt = new Date(notif.created_at || Date.now());
        return {
          id: notif._id || notif.id,
          text: notif.body || notif.title || 'New notification',
          time: getTimeAgo(dt),
          rawTime: dt,
          avatar: notif.type?.substring(0, 2).toUpperCase() || '📢',
          boardId: notif.board_id,
          taskId: notif.task_id,
          read_at: notif.read_at,
        };
      });

      setNotifItems(itemsBuilt);
      const unread = notifications.filter((n: any) => !n.read_at).length;
      setNotifUnreadCount(unread);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const id = setInterval(() => loadNotifications(), 60000);
    return () => clearInterval(id);
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const handleReload = () => setTimeout(() => loadNotifications(), 100);
    socket.on('task_moved', handleReload);
    socket.on('task_updated', handleReload);
    socket.on('task_created', handleReload);
    socket.on('notification', handleReload);
    return () => {
      socket.off('task_moved');
      socket.off('task_updated');
      socket.off('task_created');
      socket.off('notification');
    };
  }, []);

  // Removed dropdown behaviors; we render notifications directly in the list

  const notifHandleMarkAsRead = async (id: string) => {
    try {
      await axiosInstance.put(`/notification/read/${id}`);
      setNotifItems((items) => items.map((i) => (i.id === id ? { ...i, read_at: new Date() } : i)));
      setNotifUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const notifHandleMarkAllAsRead = async () => {
    try {
      const unreadItems = notifItems.filter((i) => !i.read_at);
      await Promise.all(unreadItems.map((i) => axiosInstance.put(`/notification/read/${i.id}`)));
      setNotifItems((items) => items.map((i) => ({ ...i, read_at: new Date() })));
      setNotifUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const notifHandleClearAllRead = async () => {
    try {
      const readItems = notifItems.filter((i) => i.read_at);
      await Promise.all(readItems.map((i) => axiosInstance.delete(`/notification/${i.id}`)));
      setNotifItems((items) => items.filter((i) => !i.read_at));
    } catch (e) {
      console.error('Failed to delete read notifications:', e);
    }
  };

  const notifUnreadItems = notifItems.filter((i) => !i.read_at);
  const notifReadItems = notifItems.filter((i) => i.read_at);

  const notifHandleItemClick = (n: any) => {
    if (notifClickTimerRef.current) {
      window.clearTimeout(notifClickTimerRef.current);
    }
    notifClickTimerRef.current = window.setTimeout(() => {
      if (n?.id && !n.read_at) notifHandleMarkAsRead(n.id);
    }, 250);
  };

  const notifHandleItemDoubleClick = (n: any) => {
    if (notifClickTimerRef.current) {
      window.clearTimeout(notifClickTimerRef.current);
      notifClickTimerRef.current = null;
    }
    notifHandleOpenNotification(n);
  };

  const notifHandleOpenNotification = (n: any) => {
    if (n?.id && !n.read_at) notifHandleMarkAsRead(n.id);
    if (n?.boardId && n?.taskId) {
      navigate(`/project/${n.boardId}/${n.taskId}`);
    } else if (n?.boardId) {
      navigate(`/project/${n.boardId}`);
    }
    // no dropdown to close
  };
  // --- end inlined NotificationBell logic ---

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] bg-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200/70 backdrop-blur">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500 motion-safe:animate-pulse" />
              Loading Overview
            </div>
            <div className="mt-3 h-7 w-64 rounded-md bg-white/60 ring-1 ring-blue-200/60 animate-pulse" />
          </div>
          <div
            className="grid gap-5 mb-8"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-none p-6 text-left shadow-lg shadow-blue-200/60 ring-1 ring-blue-300/70 bg-white/80 backdrop-blur animate-pulse"
              >
                <div className="h-4 w-24 bg-blue-200/60 rounded mb-4" />
                <div className="h-8 w-16 bg-blue-200/60 rounded mb-2" />
                <div className="h-3 w-32 bg-blue-200/60 rounded" />
              </div>
            ))}
          </div>
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            }}
          >
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/90 backdrop-blur rounded-none p-6 shadow-sm ring-1 ring-blue-200/60 animate-pulse"
              >
                <div className="h-6 w-48 bg-blue-200/60 rounded mb-6" />
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-16 bg-blue-100/60 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] bg-white px-4 sm:px-6 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="relative mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-900 via-sky-800 to-cyan-700 bg-clip-text text-transparent">
            Welcome back! 👋
          </h1>
          <p className="mt-2 text-sm text-blue-900/70">
            Here's what's happening with your projects today
          </p>
          <div className="mt-3 h-1 w-28 rounded-full bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400 shadow-sm" />
        </div>

        {/* Analytics overview quick actions (admins only) */}
        {isAdminOrManager && (
          <div className="grid gap-3 sm:gap-4 mb-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() =>
                navigate(
                  `/dashboard/analytics/throughput${
                    analyticsContext.boardId ? `?board=${analyticsContext.boardId}` : ''
                  }`,
                )
              }
              className="relative overflow-hidden rounded-none p-5 text-left shadow-lg shadow-blue-200/60 ring-1 ring-blue-300/70 bg-white/80 backdrop-blur hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-300/80 hover:ring-blue-400 transition-all duration-300 group"
            >
              <div className="absolute right-4 top-4 w-10 h-10 text-2xl text-blue-700 drop-shadow-lg flex items-center justify-center bg-white/40 rounded-xl">
                📈
              </div>
              <div className="relative z-10 space-y-2">
                <p className="text-xs uppercase tracking-wide text-blue-800/80">Throughput</p>
                <h2 className="text-3xl font-extrabold text-blue-950 drop-shadow-sm">
                  {stats.totalTasks}
                </h2>
                <p className="text-xs text-blue-900/70">
                  Total tasks across {stats.totalProjects} project(s)
                </p>
              </div>
            </button>

            <button
              onClick={() =>
                navigate(
                  `/dashboard/analytics/at-risk${
                    analyticsContext.boardId ? `?board=${analyticsContext.boardId}` : ''
                  }`,
                )
              }
              className="relative overflow-hidden rounded-none p-5 text-left shadow-lg shadow-red-200/60 ring-1 ring-red-300/70 bg-white/80 backdrop-blur hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-300/80 hover:ring-red-400 transition-all duration-300 group"
            >
              <div className="absolute right-4 top-4 w-10 h-10 text-2xl text-red-700 drop-shadow-lg flex items-center justify-center bg-white/40 rounded-xl">
                ⚠️
              </div>
              <div className="relative z-10 space-y-2">
                <p className="text-xs uppercase tracking-wide text-red-800/80">At-risk tasks</p>
                <h2 className="text-3xl font-extrabold text-red-950 drop-shadow-sm">
                  {stats.overdueTasks}
                </h2>
                <p className="text-xs text-red-900/70">Overdue or pending review</p>
              </div>
            </button>
          </div>
        )}

        {/* Stats Cards Grid */}
        <div className="grid gap-4 sm:gap-5 mb-6 sm:mb-8 grid-cols-2 lg:grid-cols-4">
          {/* Total Projects Card */}
          <button
            className="relative overflow-hidden rounded-none p-4 sm:p-6 text-left shadow-lg shadow-blue-200/60 ring-1 ring-blue-300/70 bg-white/80 backdrop-blur hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-300/80 hover:ring-blue-400 transition-all duration-300 group"
            onClick={() => navigate('/dashboard/projects')}
          >
            <div className="absolute right-4 top-4 w-9 h-9 text-2xl text-blue-700 drop-shadow-lg flex items-center justify-center bg-white/40 rounded-xl">
              📊
            </div>
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-wide text-blue-800/80 mb-1">
                Total Projects
              </p>
              <h2 className="text-4xl font-extrabold text-blue-950 drop-shadow-sm">
                {stats.totalProjects}
              </h2>
              <p className="text-xs text-blue-900/70 mt-2">+2 this month</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-sky-50/70 to-blue-100/60" />
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-300/30 blur-2xl transition-transform duration-300 motion-safe:group-hover:scale-110" />
            <div className="pointer-events-none absolute left-6 bottom-6 h-px w-28 bg-gradient-to-r from-blue-400/70 via-sky-400/70 to-transparent opacity-0 transition-opacity motion-safe:group-hover:opacity-100" />
          </button>

          {/* Active Boards Card */}
          <div
            onClick={() => navigate(`/user/logUser`)}
            className="
    group 
    relative overflow-hidden rounded-none p-6 text-left shadow-lg shadow-blue-200/60 
    ring-1 ring-blue-300/70 bg-white/80 backdrop-blur 
    transition-all duration-300 cursor-pointer
    hover:shadow-blue-300 hover:-translate-y-1 hover:scale-[1.02]
  "
          >
            {/* Icon */}
            <div
              className="
      absolute right-4 top-4 w-9 h-9 text-2xl text-sky-700 
      drop-shadow-lg flex items-center justify-center bg-white/40 
      rounded-xl transition-transform duration-300
      group-hover:scale-110 group-hover:rotate-6
    "
            >
              📋
            </div>

            <div className="relative z-10">
              <p className="text-xs uppercase tracking-wide text-blue-800/80 mb-1">Log by User</p>
              <h2 className="text-4xl font-extrabold text-blue-950 drop-shadow-sm transition-all duration-300 group-hover:text-sky-700">
                {stats.activeBoards}
              </h2>
              <p className="text-xs text-blue-900/70 mt-2">Across all projects</p>
            </div>

            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-sky-50/70 to-blue-100/60 transition-opacity duration-300 group-hover:opacity-90" />

            {/* Bubble bottom-left */}
            <div
              className="
      pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full 
      bg-cyan-300/30 blur-2xl transition-transform duration-300 
      group-hover:translate-x-3 group-hover:-translate-y-2
    "
            />

            {/* Bubble top-right */}
            <div
              className="
      pointer-events-none absolute right-6 top-6 h-10 w-10 rounded-full 
      bg-sky-300/40 blur-xl motion-safe:animate-pulse 
      transition-transform duration-300 group-hover:scale-125
    "
            />
          </div>

          {/* Total Tasks Card */}
          <div className="relative overflow-hidden rounded-none p-6 text-left shadow-lg shadow-blue-200/60 ring-1 ring-blue-300/70 bg-white/80 backdrop-blur hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-300/80 hover:ring-blue-400 transition-all duration-300 group">
            <div className="absolute right-4 top-4 w-9 h-9 text-2xl text-emerald-700 drop-shadow-lg flex items-center justify-center bg-white/40 rounded-xl">
              ✅
            </div>
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-wide text-blue-800/80 mb-1">Total Tasks</p>
              <h2 className="text-4xl font-extrabold text-blue-950 drop-shadow-sm">
                {stats.totalTasks}
              </h2>
              <p className="text-xs text-blue-900/70 mt-2">{stats.completedTasks} completed</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-cyan-50/70 to-blue-100/60" />
            <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rotate-12 bg-gradient-to-tr from-blue-200/40 to-sky-200/30" />
            <div className="pointer-events-none absolute -bottom-8 left-1/3 h-1 w-44 bg-gradient-to-r from-sky-400/60 via-cyan-400/60 to-transparent blur-md opacity-0 transition-opacity motion-safe:group-hover:opacity-100" />
          </div>

          {/* Team Members Card */}
          <div className="relative overflow-hidden rounded-none p-6 text-left shadow-lg shadow-blue-200/60 ring-1 ring-blue-300/70 bg-white/80 backdrop-blur hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-300/80 hover:ring-blue-400 transition-all duration-300 group">
            <div className="absolute right-4 top-4 w-9 h-9 text-2xl text-amber-700 drop-shadow-lg flex items-center justify-center bg-white/40 rounded-xl">
              👥
            </div>
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-wide text-blue-800/80 mb-1">Team Members</p>
              <h2 className="text-4xl font-extrabold text-blue-950 drop-shadow-sm">
                {stats.teamMembers}
              </h2>
              <p className="text-xs text-blue-900/70 mt-2">Active collaborators</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-sky-50/70 to-blue-100/60" />
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-sky-300/30 blur-2xl" />
            <div className="pointer-events-none absolute left-6 bottom-6 h-12 w-12 rounded-full bg-cyan-300/30 blur-xl motion-safe:animate-pulse" />
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Completion Rate */}
          <div className="bg-white rounded-none p-4 sm:p-6 border border-blue-100 shadow-md hover:shadow-lg transition-all duration-300">
            <p className="text-sm font-medium text-blue-800 mb-2">Completion Rate</p>
            <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
              {Number(stats.completionRate)?.toFixed
                ? Number(stats.completionRate).toFixed(1)
                : stats.completionRate}
              %
            </h3>
            <div className="w-full h-2 bg-blue-100 rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>

          {/* Tasks Created This Week */}
          <div className="bg-white rounded-none p-6 border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <p className="text-sm font-medium text-blue-800 mb-2">Created This Week</p>
            <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
              {stats.tasksCreatedThisWeek}
            </h3>
            <p className="text-sm text-blue-600 mt-2">New tasks</p>
          </div>

          {/* Tasks Completed This Week */}
          <div className="bg-white rounded-none p-6 border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <p className="text-sm font-medium text-blue-800 mb-2">Completed This Week</p>
            <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-green-600">
              {stats.tasksCompletedThisWeek}
            </h3>
            <p className="text-sm text-green-600 mt-2">Finished tasks</p>
          </div>

          {/* Overdue Tasks Card */}
          <div
            className={`group rounded-none p-6 shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
              stats.overdueTasks > 0
                ? 'bg-gradient-to-br from-red-500 to-red-600 hover:shadow-2xl hover:shadow-red-500/40'
                : 'bg-white border-2 border-blue-100 hover:shadow-xl'
            }`}
            onClick={() => navigate('/dashboard/reports')}
          >
            <div className="flex justify-between items-start">
              <div>
                <p
                  className={`text-sm font-medium mb-2 ${
                    stats.overdueTasks > 0 ? 'text-red-100' : 'text-blue-800'
                  }`}
                >
                  ⚠ Overdue Tasks
                </p>
                <h3
                  className={`text-3xl font-bold ${
                    stats.overdueTasks > 0
                      ? 'text-white'
                      : 'bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                >
                  {stats.overdueTasks}
                </h3>
                <p
                  className={`text-sm mt-2 ${
                    stats.overdueTasks > 0 ? 'text-red-100' : 'text-red-600'
                  }`}
                >
                  {stats.overdueTasks > 0 ? 'Needs attention!' : 'All on track'}
                </p>
              </div>
              {stats.overdueTasks > 0 && (
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                  ⚠
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Projects Overview */}
          <div className="bg-white rounded-none p-6 sm:p-8 border border-blue-100 shadow-md hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                Projects Overview
              </h3>
              <button
                onClick={() => navigate('/dashboard/projects')}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-md hover:bg-blue-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/dashboard/boards/${project.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      navigate(`/dashboard/boards/${project.id}`);
                  }}
                  className="bg-gradient-to-r from-white to-blue-50 rounded-xl px-5 py-4 border-2 border-blue-100 transition-all duration-300 cursor-pointer hover:shadow-md hover:translate-x-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: project.color }} />
                      <span className="text-base font-semibold text-blue-800">{project.name}</span>
                    </div>
                    <span
                      className="text-sm font-semibold px-3 py-1 rounded-full"
                      style={{
                        background: `${project.color}15`,
                        color: project.color,
                      }}
                    >
                      {project.status}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-blue-600 mb-2">
                      <span>
                        {project.completed}/{project.tasks} tasks
                      </span>
                      <span className="font-semibold">{project.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${project.progress}%`,
                          background: project.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-none p-8 border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
            {/* Header + actions */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                Recent Activities
              </h3>
              <div className="flex items-center gap-2">
                {notifActiveTab === 'unread' && notifUnreadItems.length > 0 && (
                  <button
                    onClick={notifHandleMarkAllAsRead}
                    disabled={notifLoading}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                    title="Mark all as read"
                  >
                    Mark all read
                  </button>
                )}
                {notifActiveTab === 'read' && notifReadItems.length > 0 && (
                  <button
                    onClick={notifHandleClearAllRead}
                    disabled={notifLoading}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
                    title="Clear all read notifications"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Clear read
                  </button>
                )}
                <button
                  onClick={loadNotifications}
                  disabled={notifLoading}
                  className="p-1.5 rounded-lg hover:bg-blue-50 transition-all disabled:opacity-50"
                  title="Refresh"
                >
                  <svg
                    className={`w-4 h-4 text-gray-600 ${notifLoading ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-blue-100 bg-blue-50 rounded-none overflow-hidden mb-4">
              {[
                {
                  key: 'unread',
                  label: 'Unread',
                  count: notifUnreadItems.length,
                },
                { key: 'read', label: 'Read', count: notifReadItems.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setNotifActiveTab(tab.key as 'unread' | 'read')}
                  className={`flex-1 px-4 py-2 text-sm font-semibold transition-all relative ${
                    notifActiveTab === tab.key
                      ? 'text-blue-700 bg-white'
                      : 'text-blue-700/70 hover:text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        notifActiveTab === tab.key
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-blue-200 text-blue-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {notifActiveTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Lists per tab */}
            <div className="max-h-[calc(100vh-400px)] overflow-y-auto custom-scrollbar pr-2">
              {notifLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {notifActiveTab === 'unread' && (
                    <>
                      {notifUnreadItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-blue-600">
                          <svg
                            className="w-16 h-16 mb-3 text-blue-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                          </svg>
                          <p className="text-sm font-medium">No new notifications</p>
                        </div>
                      ) : (
                        notifUnreadItems.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => notifHandleItemClick(n)}
                            onDoubleClick={() => notifHandleItemDoubleClick(n)}
                            className="px-1 py-3 hover:bg-blue-50 cursor-pointer transition-all duration-200 border-b border-blue-100 last:border-b-0 group"
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {n.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-blue-900 font-medium line-clamp-2 group-hover:text-blue-700 transition-colors break-words">
                                  {n.text}
                                </p>
                                <p className="text-xs text-blue-400 mt-1">{n.time}</p>
                              </div>
                              <div className="flex-shrink-0">
                                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse mt-2"></div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {notifActiveTab === 'read' && (
                    <>
                      {notifReadItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-blue-600">
                          <svg
                            className="w-16 h-16 mb-3 text-blue-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-sm font-medium">No read notifications</p>
                        </div>
                      ) : (
                        notifReadItems.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => notifHandleItemDoubleClick(n)}
                            className="px-1 py-3 hover:bg-blue-50 cursor-pointer transition-all duration-200 border-b border-blue-100 last:border-b-0 opacity-80 hover:opacity-100"
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                {n.avatar}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-blue-800 line-clamp-2 break-words">
                                  {n.text}
                                </p>
                                <p className="text-xs text-blue-400 mt-1">{n.time}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tasks by Priority */}
          <div className="bg-white rounded-none p-8 border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 mb-6">
              Tasks by Priority
            </h3>

            <div className="space-y-6">
              {/* High Priority */}
              <div>
                <div className="flex justify-between mb-3">
                  <span className="text-base text-blue-800 font-semibold">🔴 High Priority</span>
                  <span className="text-base font-bold text-red-500">{tasksByPriority.high}</span>
                </div>
                <div className="w-full h-3 bg-blue-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-300"
                    style={{
                      width: `${
                        stats.totalTasks > 0 ? (tasksByPriority.high / stats.totalTasks) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Medium Priority */}
              <div>
                <div className="flex justify-between mb-3">
                  <span className="text-base text-blue-800 font-semibold">🟡 Medium Priority</span>
                  <span className="text-base font-bold text-orange-500">
                    {tasksByPriority.medium}
                  </span>
                </div>
                <div className="w-full h-3 bg-blue-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                    style={{
                      width: `${
                        stats.totalTasks > 0 ? (tasksByPriority.medium / stats.totalTasks) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Low Priority */}
              <div>
                <div className="flex justify-between mb-3">
                  <span className="text-base text-blue-800 font-semibold">🟢 Low Priority</span>
                  <span className="text-base font-bold text-green-500">{tasksByPriority.low}</span>
                </div>
                <div className="w-full h-3 bg-blue-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                    style={{
                      width: `${
                        stats.totalTasks > 0 ? (tasksByPriority.low / stats.totalTasks) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* No Priority */}
              <div>
                <div className="flex justify-between mb-3">
                  <span className="text-base text-blue-800 font-semibold">⚪ No Priority</span>
                  <span className="text-base font-bold text-gray-500">{tasksByPriority.none}</span>
                </div>
                <div className="w-full h-3 bg-blue-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gray-500 to-gray-400 transition-all duration-300"
                    style={{
                      width: `${
                        stats.totalTasks > 0 ? (tasksByPriority.none / stats.totalTasks) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tasks by Status */}
          <div className="bg-white rounded-none p-8 border-2 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 mb-6">
              Tasks by Status
            </h3>

            <div className="space-y-6">
              {tasksByStatus.slice(0, 6).map((status: any, index: number) => {
                const colors = [
                  ['#2196F3', '#64B5F6'],
                  ['#4CAF50', '#81C784'],
                  ['#FF9800', '#FFB74D'],
                  ['#F44336', '#E57373'],
                  ['#9C27B0', '#BA68C8'],
                  ['#00BCD4', '#4DD0E1'],
                ];
                const [colorStart, colorEnd] = colors[index % colors.length];
                const percentage =
                  stats.totalTasks > 0 ? Math.round((status.count / stats.totalTasks) * 100) : 0;

                return (
                  <div key={status.name}>
                    <div className="flex justify-between mb-3">
                      <span className="text-base text-blue-800 font-semibold">{status.name}</span>
                      <span className="text-base font-bold" style={{ color: colorStart }}>
                        {status.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-blue-50 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          background: `linear-gradient(to right, ${colorStart}, ${colorEnd})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
