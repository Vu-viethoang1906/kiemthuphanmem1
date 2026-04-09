import React, { useEffect, useState } from 'react';

import { fetchTemplates } from '../../api/templateApi';
import {
  cloneBoardFromTemplate,
  fetchMyBoards,
  createBoard,
  deleteBoard,
} from '../../api/boardApi';
import { createColumn } from '../../api/columnApi';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useModal } from '../../components/ModalProvider';
import toast from 'react-hot-toast';
import LoadingScreen from '../../components/LoadingScreen';
import { importFileTask } from '../../api/fileApi';
import { invalidateBoardCache } from '../../utils/boardCache';
import { useUrlState } from '../../hooks/useUrlState';
import { useVietnameseSearch } from '../../hooks/useVietnameseSearch';
import { fetchBoardMembers } from '../../api/boardMemberApi';
import { fetchAvatarUser } from '../../api/avataApi';
import CloneTemplateSection from '../../components/CloneTemplateSection';
import { uploadLimits, formatBytes } from '../../config/uploadLimits';
import { socket } from '../../socket';

// Helper function to generate simple color from name
const getColorFromName = (name: string): string => {
  const colors = [
    '#6B7280',
    '#9CA3AF',
    '#6366F1',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#3B82F6',
    '#14B8A6',
    '#F97316',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const Projects: React.FC = () => {
  const { confirm } = useModal();
  const navigate = useNavigate();

  // 🔥 Deep Linking: Sync state with URL
  const [urlState, setUrlState] = useUrlState({
    page: '1',
    limit: '10',
    q: '',
  });

  // 🔥 Vietnamese Search Hook
  const {
    searchValue,
    searchTerm,
    handleInputChange,
    handleCompositionStart,
    handleCompositionEnd,
  } = useVietnameseSearch({
    page: '1',
    limit: '10',
    q: '',
  });

  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);
  const [me, setMe] = useState<any | null>(null);
  const [myBoards, setMyBoards] = useState<any[]>([]);
  const [loadingBoards, setLoadingBoards] = useState<boolean>(true);
  const [totalBoards, setTotalBoards] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [boardMembers, setBoardMembers] = useState<Record<string, any[]>>({});
  const [memberAvatars, setMemberAvatars] = useState<Record<string, string>>({});
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);

  // Modal states
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneBoardTitle, setCloneBoardTitle] = useState('');
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);

  // Create Board Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [createDefaultColumns, setCreateDefaultColumns] = useState(true);

  // Template Preview Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Activity Feed state
  const [activities, setActivities] = useState<any[]>([]);

  const translateActivityText = (text?: string | null) => {
    if (!text) return text || '';
    let t = text;

    // Common patterns
    t = t.replace(/Task có nguy cơ trễ hạn[:：]?\s*/gi, 'Task at risk of delay: ');
    t = t.replace(/có nguy cơ trễ hạn với điểm số/gi, 'is at risk of delay with score');

    // Example: Task "admin" có nguy cơ trễ hạn với điểm số 0.60
    t = t.replace(
      /Task\s*\"([^\"]+)\"\s*có nguy cơ trễ hạn với điểm số\s*([0-9.]+)/i,
      'Task "$1" is at risk of delay with score $2',
    );

    // Generic replacements to English words
    t = t.replace(/Học viên/gi, 'Assignee');
    t = t.replace(/ngày/gi, 'days');

    return t;
  };

  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'members'>('date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSortDropdown) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSortDropdown]);

  // Parse URL state
  const currentPage = parseInt(urlState.page) || 1;
  const itemsPerPage = parseInt(urlState.limit) || 12;

  // Load activities (from notifications)
  const loadActivities = async () => {
    try {
      const userId = localStorage.getItem('userId') || 'anonymous';
      const response = await axiosInstance.get(`/notification/${userId}`);
      const notifications = response.data?.data || [];

      // Get 10 most recent notifications and sort by time
      const recentActivities = notifications
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 10);

      setActivities(recentActivities);
      console.log('📊 Activities loaded:', recentActivities.length);
    } catch (error) {
      console.error('❌ Failed to load activities:', error);
      setActivities([]);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  // Socket listeners for realtime updates (similar to NotificationBell)
  useEffect(() => {
    if (!socket) {
      return;
    }
    const handleReload = () => {
      setTimeout(() => loadActivities(), 100);
    };
    socket.on('task_moved', handleReload);
    socket.on('task_updated', handleReload);
    socket.on('task_created', handleReload);
    socket.on('comment_created', handleReload);
    socket.on('comment_updated', handleReload);
    socket.on('comment_deleted', handleReload);
    socket.on('notification', handleReload);
    return () => {
      socket.off('task_moved', handleReload);
      socket.off('task_updated', handleReload);
      socket.off('task_created', handleReload);
      socket.off('comment_created', handleReload);
      socket.off('comment_updated', handleReload);
      socket.off('comment_deleted', handleReload);
      socket.off('notification', handleReload);
    };
  }, []);

  // Load templates and user info once
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [tplRes, meRes, boardsRes] = await Promise.all([
          fetchTemplates(),
          axiosInstance.get('/user/me'),
          await fetchMyBoards(),
        ]);
        setTemplates(Array.isArray(tplRes) ? tplRes : tplRes?.data || []);
        const userData = meRes.data?.data || null;
        setMe(userData);
        const boards = boardsRes?.data || boardsRes?.data?.data || [];
        setMyBoards(boards);

        // Load members for each board
        const membersMap: Record<string, any[]> = {};
        await Promise.all(
          boards.map(async (board: any) => {
            try {
              const boardId = board._id || board.id;
              const membersRes = await fetchBoardMembers(boardId);
              const members = membersRes?.data?.data || membersRes?.data || [];

              // Filter out current user
              const otherMembers = members.filter((m: any) => {
                const memberId = m.user_id?._id || m.user_id?.id || m.user_id;
                const currentUserId = userData?._id || userData?.id;
                return memberId !== currentUserId;
              });
              membersMap[boardId] = otherMembers;
            } catch (err) {
              membersMap[board._id || board.id] = [];
            }
          }),
        );
        setBoardMembers(membersMap);

        // Fetch avatars for all members
        const avatars: Record<string, string> = {};
        const allMembers = Object.values(membersMap).flat();
        await Promise.all(
          allMembers.map(async (member: any) => {
            const userId = member.user_id?._id || member.user_id?.id || member.user_id;
            if (userId && !avatars[userId]) {
              try {
                const result = await fetchAvatarUser(String(userId));
                if (result?.avatar_url) {
                  avatars[userId] = result.avatar_url;
                }
              } catch (error) {
                // Ignore avatar fetch errors
              }
            }
          }),
        );
        setMemberAvatars(avatars);
      } catch (e: any) {
        // 🔥 Check permission errors
        if (e?.response?.status === 403) {
          toast.error("You don't have permission to view templates");
        } else if (e?.response?.status === 401) {
          toast.error('Session expired');
        }

        setTemplates([]);
        setMe(null);
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadInitial();
  }, []);

  // 🔥 Check URL parameter to auto-open clone template modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action === 'clone-template') {
      setViewMode('templates');
      // Remove the parameter from URL after reading
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // 🔥 Load boards when URL state changes
  useEffect(() => {
    loadBoards();
  }, [currentPage, searchTerm]);

  const loadBoards = async (
    forceRefresh?: boolean,
    overrides?: { page?: number; search?: string; limit?: number },
  ) => {
    try {
      setLoadingBoards(true);
      setHasPermissionError(false);

      // 🔥 Server-side pagination with search
      const fetchParams: any = {
        page: overrides?.page ?? currentPage,
        limit: overrides?.limit ?? itemsPerPage,
        sortBy: 'created_at',
        sortOrder: 'desc',
        search: (overrides?.search ?? searchTerm) || undefined,
      };

      // Add a cache-busting param when a fresh fetch is requested
      if (forceRefresh) {
        fetchParams._cacheBust = String(Date.now());
      }

      const boardsRes = await fetchMyBoards(fetchParams);

      // Handle response structure from backend
      const boardsData = boardsRes?.data || [];
      const pagination = boardsRes?.pagination || {};

      setMyBoards(Array.isArray(boardsData) ? boardsData : []);
      setTotalBoards(pagination.total || 0);
      setTotalPages(pagination.pages || 1);

      // Load members for each board
      if (Array.isArray(boardsData) && boardsData.length > 0) {
        const membersMap: Record<string, any[]> = {};
        await Promise.all(
          boardsData.map(async (board: any) => {
            try {
              const boardId = board._id || board.id;
              const membersRes = await fetchBoardMembers(boardId);
              const members = membersRes?.data?.data || membersRes?.data || [];

              // Filter out current user
              const otherMembers = members.filter((m: any) => {
                const memberId = m.user_id?._id || m.user_id?.id || m.user_id;
                const currentUserId = me?._id || me?.id;
                return memberId !== currentUserId;
              });
              membersMap[boardId] = otherMembers;
            } catch (err) {
              membersMap[board._id || board.id] = [];
            }
          }),
        );
        setBoardMembers(membersMap);

        // Fetch avatars for all members
        const avatars: Record<string, string> = {};
        const allMembers = Object.values(membersMap).flat();
        await Promise.all(
          allMembers.map(async (member: any) => {
            const userId = member.user_id?._id || member.user_id?.id || member.user_id;
            if (userId && !avatars[userId]) {
              try {
                const result = await fetchAvatarUser(String(userId));
                if (result?.avatar_url) {
                  avatars[userId] = result.avatar_url;
                }
              } catch (error) {
                // Ignore avatar fetch errors
              }
            }
          }),
        );
        setMemberAvatars(avatars);
      }
    } catch (e: any) {
      // 🔥 Check permission errors
      if (e?.response?.status === 403) {
        setHasPermissionError(true);
        toast.error("You don't have permission to view boards");
      } else if (e?.response?.status === 401) {
        toast.error('Session expired');
      }

      setMyBoards([]);
      setTotalBoards(0);
      setTotalPages(1);
    } finally {
      setLoadingBoards(false);
    }
  };

  const [viewMode, setViewMode] = useState<'boards' | 'templates'>('boards');

  // 🔥 URL State handlers (keep for pagination)

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setUrlState({ ...urlState, page: page.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloneFromTemplate = (templateId: string) => {
    setCurrentTemplateId(templateId);
    setCloneBoardTitle('');
    setShowCloneModal(true);
  };

  const handleCreateNewBoard = () => {
    setNewBoardTitle('');
    setNewBoardDescription('');
    setCreateDefaultColumns(true);
    setShowCreateModal(true);
  };

  const handleDeleteBoard = async (boardId: string, boardTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = await confirm({
      title: 'Confirm Delete Board',
      message: `Are you sure you want to delete board "${boardTitle}"?\nThis action cannot be undone!`,
      variant: 'error',
    });

    if (!confirmed) return;

    try {
      await deleteBoard(boardId);
      toast.success(
        <div>
          <div className="font-semibold mb-1">Board deleted successfully!</div>
          <div className="text-sm text-gray-500">Board has been removed from the list.</div>
        </div>,
      );
      // Reload boards (force refresh to bypass any stale cache)
      await loadBoards(true);
    } catch (err: any) {
      // 🔥 Check permission errors
      if (err?.response?.status === 403) {
        toast.error("You don't have permission to delete this board");
      } else if (err?.response?.status === 401) {
        toast.error('Session expired');
      } else {
        toast.error(err?.response?.data?.message || 'Failed to delete board');
      }
    }
  };

  const executeCreateBoard = async () => {
    if (!newBoardTitle.trim()) {
      toast.error('Please enter board name!');
      return;
    }

    try {
      const userId = me?._id || me?.id;
      const res = await createBoard({
        title: newBoardTitle.trim(),
        description: newBoardDescription.trim(),
        userId,
      });

      const newBoardId = res?.data?._id || res?.data?.id;

      // Create default columns if selected
      if (createDefaultColumns && newBoardId) {
        const defaultColumns = [
          { name: 'To Do', order: 1, isdone: false },
          { name: 'In Progress', order: 2, isdone: false },
          { name: 'Done', order: 3, isdone: true },
        ];

        await Promise.all(
          defaultColumns.map((col) =>
            createColumn({
              board_id: newBoardId,
              name: col.name,
              order: col.order,
              isdone: col.isdone,
            }),
          ),
        );
      }

      toast.success(
        <div>
          <div className="font-semibold mb-1">Board created successfully!</div>
          <div className="text-sm text-gray-500">Redirecting to new board...</div>
        </div>,
      );

      setShowCreateModal(false);
      setNewBoardTitle('');
      setNewBoardDescription('');

      // Reload boards (force refresh to bypass any stale cache)
      await loadBoards(true);

      // Open new board
      if (newBoardId) {
        localStorage.setItem('lastOpenedBoardId', newBoardId);
        navigate(`/project/${newBoardId}`);
      }
    } catch (error: any) {
      // 🔥 Check permission errors
      if (error?.response?.status === 403) {
        toast.error("You don't have permission to create board");
      } else if (error?.response?.status === 401) {
        toast.error('Session expired');
      } else {
        toast.error(error?.response?.data?.message || 'Failed to create board!');
      }
    }
  };

  const executeCloneBoard = async () => {
    if (!cloneBoardTitle.trim()) {
      toast.error('Please enter board name!');
      return;
    }

    if (!currentTemplateId) return;

    try {
      const userId = me?._id || me?.id;
      const res = await cloneBoardFromTemplate(currentTemplateId, {
        title: cloneBoardTitle.trim(),
        description: '',
        userId,
      });
      const newBoardId =
        res?.data?.data?._id || res?.data?.data?.id || res?.data?._id || res?.data?.id;

      toast.success(
        <div>
          <div className="font-semibold mb-1">Board cloned successfully!</div>
          <div className="text-sm text-gray-500">Redirecting to new board...</div>
        </div>,
      );

      setShowCloneModal(false);
      setCloneBoardTitle('');
      setCurrentTemplateId(null);

      // refresh my boards (force refresh to bypass any stale cache)
      await loadBoards(true);

      if (newBoardId) {
        localStorage.setItem('lastOpenedBoardId', newBoardId);
        navigate(`/project/${newBoardId}`);
      }
    } catch (e: any) {
      // 🔥 Check permission errors
      if (e?.response?.status === 403) {
        toast.error("You don't have permission to clone board from template");
      } else if (e?.response?.status === 401) {
        toast.error('Session expired');
      } else {
        toast.error(e?.response?.data?.message || 'Failed to clone board!');
      }
    }
  };
  // Sample issues data
  const issues = [
    {
      id: 'ECP-2',
      title: 'Fix checkout page bug',
      status: 'To Do',
      assignee: 'https://via.placeholder.com/30',
      comments: 0,
    },
    {
      id: 'ECP-1',
      title: 'Implement user authentication',
      status: 'In Progress',
      assignee: 'https://via.placeholder.com/30',
      comments: 1,
    },
    {
      id: 'ECP-3',
      title: 'Design product catalog UI',
      status: 'Review',
      assignee: 'https://via.placeholder.com/30',
      comments: 1,
    },
    {
      id: 'ECP-4',
      title: 'Optimize database queries',
      status: 'Done',
      assignee: 'https://via.placeholder.com/30',
      comments: 2,
    },
  ];

  const importFile = async () => {
    // Inform user about size limit before selecting file
    toast.dismiss('project-import-limit');
    toast.success(`Maximum file size for imports is ${formatBytes(uploadLimits.importMaxBytes)}.`, {
      id: 'project-import-limit',
      duration: 2500,
      icon: 'ℹ️',
    });

    // Create input to select file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv, .xlsx, .json'; // only allow valid files (can be adjusted)

    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > uploadLimits.importMaxBytes) {
        toast.error(
          `File exceeds the maximum size of ${formatBytes(uploadLimits.importMaxBytes)}.`,
        );
        return;
      }

      try {
        // Snapshot current boards before import to detect newly created board reliably
        const beforeBoardsRes = await fetchMyBoards({
          page: 1,
          limit: 200,
          sortBy: 'created_at',
          sortOrder: 'desc',
        });
        const beforeBoardIds = new Set(
          (beforeBoardsRes?.data || [])
            .map((board: any) => String(board?._id || board?.id || ''))
            .filter(Boolean),
        );

        // If backend has import endpoint, send file to it
        const formData = new FormData();
        formData.append('file', file);

        const derivedBoardName = file.name.replace(/\.[^/.]+$/, '').trim();
        const res = await importFileTask(formData, {
          createNewBoard: true,
          boardName: derivedBoardName || undefined,
        });
        const importedCount =
          Number(res?.count) ||
          Number(res?.data?.successCount) ||
          Number(res?.successCount) ||
          0;
        const importedBoards =
          res?.importedBoards ||
          res?.data?.importedBoards ||
          [];

        toast.success(
          <div>
            <div className="font-semibold mb-1">Data imported successfully!</div>
            <div className="text-sm text-gray-500">
              Imported {importedCount} task{importedCount === 1 ? '' : 's'} to{' '}
              {importedBoards.length || 0} board{importedBoards.length === 1 ? '' : 's'}.
            </div>
          </div>,
        );

        // Invalidate board cache so newly imported boards are fetched from server
        invalidateBoardCache();
        // Ensure new board is visible even if user is on another page or has active search filter
        setUrlState({ ...urlState, page: '1', q: '', limit: '100' }, true);
        await loadBoards(true, { page: 1, search: '', limit: 100 });

        // 1) If backend returns imported boards, open the first one directly
        const firstImportedBoardId = importedBoards?.[0]?.id;
        if (firstImportedBoardId) {
          localStorage.setItem('lastOpenedBoardId', firstImportedBoardId);
          navigate(`/project/${firstImportedBoardId}`);
          return;
        }

        // 2) Fallback: compare board list before/after import to find newly created board
        const afterBoardsRes = await fetchMyBoards({
          page: 1,
          limit: 200,
          sortBy: 'created_at',
          sortOrder: 'desc',
        });
        const afterBoards = Array.isArray(afterBoardsRes?.data) ? afterBoardsRes.data : [];
        const newlyCreatedBoard = afterBoards.find(
          (board: any) => !beforeBoardIds.has(String(board?._id || board?.id || '')),
        );

        if (newlyCreatedBoard?._id || newlyCreatedBoard?.id) {
          const boardId = String(newlyCreatedBoard._id || newlyCreatedBoard.id);
          localStorage.setItem('lastOpenedBoardId', boardId);
          navigate(`/project/${boardId}`);
        }
      } catch (err: any) {
        // 🔥 Check permission errors
        if (err?.response?.status === 403) {
          toast.error("You don't have permission to import data");
        } else if (err?.response?.status === 401) {
          toast.error('Session expired');
        } else {
          toast.error(err?.response?.data?.message || 'Import failed!');
        }
      }
    };

    input.click();
  };
  //
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      {viewMode === 'boards' && (
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
            {/* Search Bar */}
            <div className="flex-1 sm:max-w-md relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                placeholder="Search projects..."
                value={searchValue}
                onChange={handleInputChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded">
                  /
                </kbd>
              </div>
            </div>

            {/* Right Side Buttons */}
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
              {/* Action Buttons Group */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Import Button */}
                <button
                  onClick={importFile}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <span className="hidden sm:inline">Import</span>
                </button>

                {/* Templates Button */}
                <button
                  onClick={() => setViewMode('templates')}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Templates</span>
                </button>

                {/* New Project Button */}
                <button
                  onClick={handleCreateNewBoard}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm hover:shadow-md transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>New Project</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {viewMode === 'templates' && (
        <CloneTemplateSection
          templates={templates}
          loadingTemplates={loadingTemplates}
          onBackClick={() => setViewMode('boards')}
          onTemplateClick={(tpl) => {
            setSelectedTemplate(tpl);
            setShowTemplateModal(true);
          }}
        />
      )}

      {viewMode === 'boards' && (
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Main Content - Deployments */}
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {/* Deployments Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Projects</h2>
                <div className="hidden sm:flex items-center gap-2 relative">
                  <span className="text-sm text-gray-600">Sort by</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSortDropdown(!showSortDropdown);
                    }}
                    className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 font-medium"
                  >
                    {sortBy === 'name' && 'Name'}
                    {sortBy === 'date' && 'Date'}
                    {sortBy === 'members' && 'Members'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Sort Dropdown */}
                  {showSortDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={() => {
                          setSortBy('date');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          sortBy === 'date' ? 'text-indigo-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        Date (Newest)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('name');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          sortBy === 'name' ? 'text-indigo-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        Name (A-Z)
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('members');
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          sortBy === 'members' ? 'text-indigo-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        Members (Most)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Deployments List */}
            {loadingBoards ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4 animate-pulse"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
                        <div className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/3" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        {[1, 2, 3].map((j) => (
                          <div
                            key={j}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 border-2 border-white"
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <div className="h-8 bg-gray-200 rounded-md w-24" />
                        <div className="h-8 bg-gray-200 rounded-md w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : hasPermissionError ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-gray-200">
                <div className="mb-6">
                  <svg
                    className="w-24 h-24 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
                <p className="text-gray-600 text-center max-w-md">
                  You don't have permission to view boards. Please contact the administrator to
                  request access.
                </p>
              </div>
            ) : myBoards.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500 font-medium">
                  {searchTerm ? 'No projects found' : 'Create your first project'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myBoards
                  .filter((b) =>
                    searchTerm
                      ? (b.title || '').toLowerCase().includes(searchTerm.toLowerCase())
                      : true,
                  )
                  .sort((a, b) => {
                    if (sortBy === 'name') {
                      return (a.title || '').localeCompare(b.title || '');
                    } else if (sortBy === 'date') {
                      return (
                        new Date(b.created_at || b.createdAt || 0).getTime() -
                        new Date(a.created_at || a.createdAt || 0).getTime()
                      );
                    } else if (sortBy === 'members') {
                      const aMemberCount = boardMembers[a._id || a.id]?.length || 0;
                      const bMemberCount = boardMembers[b._id || b.id]?.length || 0;
                      return bMemberCount - aMemberCount;
                    }
                    return 0;
                  })
                  .map((b) => {
                    const boardId = b._id || b.id;
                    const members = boardMembers[boardId] || [];
                    const statusColor =
                      members.length > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700';
                    const statusText = members.length > 0 ? 'Production' : 'Preview';

                    return (
                      <div
                        key={boardId}
                        className="group bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => {
                          localStorage.setItem('lastOpenedBoardId', boardId);
                          navigate(`/project/${boardId}`);
                        }}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 gap-3 sm:gap-0">
                          {/* Left: Project Info */}
                          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
                            {/* Status Indicator */}
                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>

                            {/* Project Name & Details */}
                            <div className="flex-1 min-w-0">
                              <div className="mb-1">
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                  {b.title}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500">
                                <span>Created {new Date(b.created_at).toLocaleDateString()}</span>
                                {members.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {members.length} {members.length > 1 ? 'members' : 'member'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Center: Member Avatars */}
                          {members.length > 0 && (
                            <div className="flex items-center -space-x-2 sm:mr-4">
                              {members.slice(0, 3).map((member: any, index: number) => {
                                const user = member.user_id;
                                const userId = user?._id || user?.id;
                                const userName = user?.full_name || user?.username || 'User';
                                const avatarUrl = userId ? memberAvatars[userId] : '';

                                return (
                                  <div
                                    key={member._id || member.id || index}
                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white flex items-center justify-center text-white font-semibold text-[10px] sm:text-xs shadow-sm"
                                    title={userName}
                                    style={{
                                      backgroundColor: avatarUrl
                                        ? 'transparent'
                                        : getColorFromName(userName),
                                    }}
                                  >
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={userName}
                                        className="w-full h-full object-cover rounded-full"
                                        onError={(e) => {
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            e.currentTarget.remove();
                                            parent.textContent = userName.charAt(0).toUpperCase();
                                            parent.style.backgroundColor =
                                              getColorFromName(userName);
                                          }
                                        }}
                                      />
                                    ) : (
                                      userName.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                );
                              })}
                              {members.length > 3 && (
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white flex items-center justify-center bg-gray-400 text-white font-semibold text-[10px] sm:text-xs shadow-sm">
                                  +{members.length - 3}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Right: Action */}
                          <div className="hidden sm:flex items-center">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Pagination Controls */}
            {!loadingBoards && myBoards.length > 0 && totalPages > 1 && (
              <div className="mt-6 sm:mt-8 bg-white rounded-xl sm:rounded-2xl shadow-md border border-indigo-100">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 px-3 sm:px-5">
                  {/* Page Info */}
                  <div className="text-xs sm:text-sm text-gray-600 font-medium order-2 sm:order-1">
                    Page {currentPage} of {totalPages}
                  </div>

                  {/* Pagination Buttons */}
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                    >
                      <svg
                        width="14"
                        height="14"
                        className="sm:w-4 sm:h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    {/* Page Numbers with Ellipsis */}
                    <div className="flex gap-1">
                      {(() => {
                        const pages: (number | string)[] = [];
                        const maxVisible = 5;

                        if (totalPages <= maxVisible) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                          if (currentPage <= 3) {
                            for (let i = 1; i <= 4; i++) pages.push(i);
                            pages.push('...');
                            pages.push(totalPages);
                          } else if (currentPage >= totalPages - 2) {
                            pages.push(1);
                            pages.push('...');
                            for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            pages.push('...');
                            for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                            pages.push('...');
                            pages.push(totalPages);
                          }
                        }

                        return pages.map((page, index) =>
                          typeof page === 'number' ? (
                            <button
                              key={index}
                              onClick={() => handlePageChange(page)}
                              className={`min-w-[32px] h-[32px] sm:min-w-[40px] sm:h-[40px] rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                currentPage === page
                                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110'
                                  : 'bg-white text-indigo-600 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 hover:scale-105'
                              }`}
                            >
                              {page}
                            </button>
                          ) : (
                            <span
                              key={index}
                              className="min-w-[32px] h-[32px] sm:min-w-[40px] sm:h-[40px] flex items-center justify-center text-gray-400 font-bold select-none text-xs sm:text-sm"
                            >
                              {page}
                            </span>
                          ),
                        );
                      })()}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <svg
                        width="14"
                        height="14"
                        className="sm:w-4 sm:h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Activity Feed */}
          <div className="hidden lg:block lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Activity Feed</h2>
              <button
                aria-label="View all activities"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                View all
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Activity Items */}
            <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {activities.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">No recent activity</div>
              ) : (
                activities.map((activity, index) => {
                  const timeAgo = (() => {
                    const now = new Date();
                    const activityDate = new Date(activity.created_at);
                    const diffMs = now.getTime() - activityDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins} minutes ago`;
                    if (diffHours < 24) return `${diffHours} hours ago`;
                    return `${diffDays} days ago`;
                  })();

                  // Determine icon based on notification type
                  const getIcon = () => {
                    const type = activity.type || '';
                    if (type.includes('create') || type.includes('new')) {
                      return (
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      );
                    }
                    if (
                      type.includes('update') ||
                      type.includes('edit') ||
                      type.includes('comment')
                    ) {
                      return (
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      );
                    }
                    if (type.includes('delete')) {
                      return (
                        <svg
                          className="w-4 h-4 text-red-600"
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
                      );
                    }
                    if (type.includes('assign')) {
                      return (
                        <svg
                          className="w-4 h-4 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      );
                    }
                    return (
                      <svg
                        className="w-4 h-4 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    );
                  };

                  return (
                    <div
                      key={activity._id || index}
                      className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          {getIcon()}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium">
                          {translateActivityText(activity.title) ||
                            translateActivityText(activity.body) ||
                            'New notification'}
                        </p>
                        {activity.body && activity.title && (
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {translateActivityText(activity.body)}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clone Board Modal */}
      {showCloneModal && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-[2000]"
          onClick={() => setShowCloneModal(false)}
        >
          <div
            className="bg-white w-[90%] max-w-[420px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">🎯 Clone Board from Template</h3>
              <button
                onClick={() => {
                  setShowCloneModal(false);
                  setCloneBoardTitle('');
                  setCurrentTemplateId(null);
                }}
                className="text-white hover:bg-white/20 rounded p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  New board name: <span className="text-red-600">*</span>
                  <span className="text-xs text-gray-500 ml-2 font-normal">
                    ({cloneBoardTitle.length}/50)
                  </span>
                </label>
                <input
                  type="text"
                  value={cloneBoardTitle}
                  onChange={(e) => setCloneBoardTitle(e.target.value)}
                  placeholder="Enter board name..."
                  maxLength={50}
                  className="w-full px-3 py-2.5 border-2 border-indigo-300 text-base outline-none transition-colors focus:border-indigo-600"
                  onKeyPress={(e) => e.key === 'Enter' && executeCloneBoard()}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCloneModal(false);
                    setCloneBoardTitle('');
                    setCurrentTemplateId(null);
                  }}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeCloneBoard}
                  disabled={!cloneBoardTitle.trim()}
                  className={`px-5 py-2.5 font-medium transition-colors ${
                    cloneBoardTitle.trim()
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Clone Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-[2000] px-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold uppercase tracking-wider">
                Create Project
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBoardTitle('');
                  setNewBoardDescription('');
                }}
                className="text-white hover:bg-white/15 rounded-full p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="Enter project name..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Description
                </label>
                <textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  placeholder="Enter description (optional)..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={createDefaultColumns}
                  onChange={(e) => setCreateDefaultColumns(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                Create default columns (To Do, In Progress, Done)
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBoardTitle('');
                  setNewBoardDescription('');
                }}
                className="px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={executeCreateBoard}
                disabled={!newBoardTitle.trim()}
                className={`px-5 py-2.5 rounded-md font-semibold text-sm text-white transition ${
                  newBoardTitle.trim()
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-md'
                    : 'bg-blue-400 cursor-not-allowed opacity-70'
                }`}
              >
                Create project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {showTemplateModal && selectedTemplate && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
              <h3 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h3>
              <button
                className="p-2 hover:bg-white/80 rounded-lg transition-colors"
                onClick={() => setShowTemplateModal(false)}
              >
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <img
                    src={selectedTemplate.image || '/icons/template-default.png'}
                    alt={selectedTemplate.name}
                    className="w-full h-auto object-cover"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedTemplate.description || 'No description available'}
                    </p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                    <p className="text-gray-700 leading-relaxed">
                      Scrum Board Template is a visual project template that helps software
                      development teams manage work using Scrum / Agile methodology. The board
                      interface is divided into columns: To Do – In Progress – Review – Done, making
                      it easy and intuitive to track work progress for each Sprint.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 font-medium rounded-lg text-sm transition-colors"
                onClick={() => setShowTemplateModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-sm transition-all shadow-md hover:shadow-lg"
                onClick={() => {
                  setShowTemplateModal(false);
                  handleCloneFromTemplate(selectedTemplate._id || selectedTemplate.id);
                }}
              >
                Clone To Board
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Projects;
