import axiosInstance from "./axiosInstance";

// ==================== NEW: GLOBAL PRODUCT BACKLOG ITEMS ====================
export type BacklogItem = {
  _id: string;
  title: string;
  description?: string;
  priority?: "High" | "Medium" | "Low";
  story_points?: number | null;
  backlog_position?: number;
  assigned_to?: { _id: string; username: string; avatar_url?: string; full_name?: string } | null;
  created_at?: string;
  updated_at?: string;
};

export const listBacklogItems = async (filters?: {
  priority?: string;
  assigned_to?: string;
  search?: string;
}) => {
  const res = await axiosInstance.get(`/backlog/items`, { params: filters });
  return res.data as { success: boolean; data: BacklogItem[] };
};

export const createBacklogItem = async (data: {
  title: string;
  description?: string;
  priority?: "High" | "Medium" | "Low";
  story_points?: number | null;
  assigned_to?: string | null;
}) => {
  const res = await axiosInstance.post(`/backlog/items`, data);
  return res.data;
};

export const updateBacklogItem = async (id: string, data: any) => {
  const res = await axiosInstance.put(`/backlog/items/${id}`, data);
  return res.data;
};

export const deleteBacklogItem = async (id: string) => {
  const res = await axiosInstance.delete(`/backlog/items/${id}`);
  return res.data;
};

export const reorderBacklogItems = async (items: { itemId: string; position: number }[]) => {
  const res = await axiosInstance.patch(`/backlog/items/reorder`, { items });
  return res.data;
};

export const convertBacklogItemsToBoard = async (payload: {
  itemIds: string[];
  boardId?: string;
  createWeeklyBoard?: boolean;
  weekly?: { baseTitle?: string; startDate?: string; title?: string; description?: string };
}) => {
  const res = await axiosInstance.post(`/backlog/items/convert`, payload);
  return res.data;
};

// ==================== LEGACY: BOARD BACKLOG (tasks with sprint_id=null) ====================
export const getBacklogTasks = async (
  boardId: string,
  filters?: { priority?: string; assigned_to?: string; search?: string }
) => {
  const queryParams = new URLSearchParams();
  if (filters?.priority) queryParams.append("priority", filters.priority);
  if (filters?.assigned_to) queryParams.append("assigned_to", filters.assigned_to);
  if (filters?.search) queryParams.append("search", filters.search);

  const res = await axiosInstance.get(`/backlog/board/${boardId}?${queryParams.toString()}`);
  return res.data;
};

export const reorderBacklog = async (boardId: string, items: { taskId: string; position: number }[]) => {
  const res = await axiosInstance.patch("/backlog/reorder", { boardId, items });
  return res.data;
};

export const updateBacklogTask = async (taskId: string, data: any) => {
  const res = await axiosInstance.patch(`/backlog/task/${taskId}`, data);
  return res.data;
};

export const moveTaskToSprint = async (taskId: string, sprintId: string | null) => {
  const res = await axiosInstance.patch(`/backlog/task/${taskId}/sprint`, { sprintId });
  return res.data;
};
