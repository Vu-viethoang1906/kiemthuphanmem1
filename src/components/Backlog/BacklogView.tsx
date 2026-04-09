import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  convertBacklogItemsToBoard,
  createBacklogItem,
  listBacklogItems,
  reorderBacklogItems,
} from "../../api/backlogApi";
import { fetchMyBoards } from "../../api/boardApi";
import BacklogTaskItem from "./BacklogTaskItem";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { invalidateBoardCache } from "../../utils/boardCache";

const BacklogView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    priority: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [newPoints, setNewPoints] = useState<number | "">("");
  const [weeklyBoardTitle, setWeeklyBoardTitle] = useState("");
  const [weeklyBoardDescription, setWeeklyBoardDescription] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await listBacklogItems(filters);
      if (res.success) {
        setTasks(res.data);
      }
    } catch (error) {
      console.error("Failed to load backlog", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filters]); // Reload when filters change

  useEffect(() => {
    const loadBoards = async () => {
      try {
        const res: any = await fetchMyBoards({ limit: 200 });
        const list = res?.data?.data || res?.data || res?.data?.boards || res?.boards || [];
        setBoards(Array.isArray(list) ? list : []);
      } catch (e) {
        setBoards([]);
      }
    };
    loadBoards();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Prepare API update
        const reorderItems = newItems.map((item, index) => ({
          itemId: item._id,
          position: index
        }));

        // Call API in background
        reorderBacklogItems(reorderItems).catch(err => {
          console.error("Reorder failed", err);
          toast.error("Failed to save order");
          fetchTasks(); // Revert on error
        });

        return newItems;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createItem = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      await createBacklogItem({
        title,
        priority: newPriority,
        story_points: newPoints === "" ? null : Number(newPoints),
      });
      setNewTitle("");
      setNewPriority("Medium");
      setNewPoints("");
      await fetchTasks();
      toast.success("Added to backlog");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create");
    }
  };

  const convertToExistingBoard = async () => {
    if (selectedIds.length === 0) return toast.error("Select items first");
    if (!selectedBoardId) return toast.error("Select a board");
    try {
      const res: any = await convertBacklogItemsToBoard({
        itemIds: selectedIds,
        boardId: selectedBoardId,
      });
      if (res?.success) {
        invalidateBoardCache();
        toast.success("Tasks created in board");
        setSelectedIds([]);
        await fetchTasks();
      } else {
        toast.error(res?.message || "Failed");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  const startWeeklyBoard = async () => {
    if (selectedIds.length === 0) return toast.error("Select items first");
    try {
      const res: any = await convertBacklogItemsToBoard({
        itemIds: selectedIds,
        createWeeklyBoard: true,
        weekly: {
          baseTitle: "Sprint",
          title: weeklyBoardTitle.trim() || undefined,
          description: weeklyBoardDescription.trim() || undefined,
        },
      });
      if (res?.success) {
        invalidateBoardCache();
        toast.success("Weekly board created and tasks moved");
        setSelectedIds([]);
        setWeeklyBoardTitle("");
        setWeeklyBoardDescription("");
        await fetchTasks();

        const createdBoardId = res?.data?.board_id || res?.data?.board?._id;
        if (createdBoardId) {
          const isAdminRoute = location.pathname.startsWith("/admin");
          const targetPath = isAdminRoute
            ? `/admin/project/${createdBoardId}`
            : `/dashboard/project/${createdBoardId}`;
          navigate(targetPath);
        }
      } else {
        toast.error(res?.message || "Failed");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 dark:bg-slate-950 p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Backlog</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Quản lý công việc trước khi đưa vào board.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
              <input
                type="text"
                placeholder="Search backlog..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-60"
              />
            </div>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-gray-600 dark:text-slate-300">
            Selected: <span className="font-semibold">{selectedIds.length}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="min-w-[260px] px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Add to existing board...</option>
              {boards.map((b: any) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.title || b.name}
                </option>
              ))}
            </select>
            <button
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={convertToExistingBoard}
              disabled={selectedIds.length === 0}
              title={selectedIds.length === 0 ? "Select items first" : ""}
            >
              Add to board
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={startWeeklyBoard}
              disabled={selectedIds.length === 0}
              title={selectedIds.length === 0 ? "Select items first" : ""}
            >
              Start weekly board
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Weekly board name (optional)"
            value={weeklyBoardTitle}
            onChange={(e) => setWeeklyBoardTitle(e.target.value)}
            className="min-w-[260px] flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Board description (optional)"
            value={weeklyBoardDescription}
            onChange={(e) => setWeeklyBoardDescription(e.target.value)}
            className="min-w-[260px] flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800 text-xs font-semibold text-gray-600 dark:text-slate-300">
          <div className="col-span-1 flex justify-center" />
          <div className="col-span-1 flex justify-center" />
          <div className="col-span-2 text-center">Priority</div>
          <div className="col-span-5">Task</div>
          <div className="col-span-1 text-center">Points</div>
          <div className="col-span-1 text-center">Assignee</div>
          <div className="col-span-1 text-right"> </div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
            Loading backlog...
          </div>
        ) : tasks.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
            No tasks in backlog
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-gray-200 dark:divide-slate-800">
                {tasks.map((task) => (
                  <BacklogTaskItem
                    key={task._id}
                    task={task}
                    selected={selectedIds.includes(task._id)}
                    onToggleSelect={toggleSelect}
                    onUpdate={fetchTasks}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="mt-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
          Create backlog item
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createItem()}
            className="flex-1 min-w-[240px] px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <input
            type="number"
            min={0}
            placeholder="Points"
            value={newPoints}
            onChange={(e) => setNewPoints(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-28 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={createItem}
            disabled={!newTitle.trim()}
          >
            Add
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          Tip: chọn nhiều item rồi dùng “Add to board” hoặc “Start weekly board”.
        </div>
      </div>
    </div>
  );
};

export default BacklogView;
