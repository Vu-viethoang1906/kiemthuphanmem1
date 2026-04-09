import React, { useState, useEffect } from "react";
import {
    getSubtasksByTask,
    createSubtask,
    toggleSubtask,
    deleteSubtask,
} from "../../api/subtaskApi";
import SubtaskItem from "./SubtaskItem";
import AddSubtaskForm from "./AddSubtaskForm";
import toast from "react-hot-toast";
import { useModal } from "../ModalProvider";
import "../../styles/BoardDetail/SubtaskList.css";

interface Subtask {
    _id: string;
    title: string;
    description?: string;
    assigned_to?: {
        _id: string;
        username: string;
        full_name?: string;
        avatar_url?: string;
    };
    priority?: "High" | "Medium" | "Low";
    due_date?: string;
    is_completed: boolean;
    position: number;
}

interface SubtaskListProps {
    taskId: string;
    members: any[];
}

const SubtaskList: React.FC<SubtaskListProps> = ({
    taskId,
    members,
}) => {
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const { confirm } = useModal();

    // Load subtasks
    const loadSubtasks = async () => {
        try {
            setLoading(true);
            const response = await getSubtasksByTask(taskId);
            if (response.success) {
                setSubtasks(response.data.items || []);
                setProgress(response.data.progress || { completed: 0, total: 0, percentage: 0 });
            }
        } catch (error: any) {
            console.error("Error loading subtasks:", error);
            toast.error(error?.response?.data?.message || "Failed to load subtasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSubtasks();
    }, [taskId]);

    // Handle add subtask
    const handleAddSubtask = async (data: {
        title: string;
        description?: string;
        assigned_to?: string;
        priority?: "High" | "Medium" | "Low";
        due_date?: string;
    }) => {
        try {
            const response = await createSubtask(taskId, data);
            if (response.success) {
                toast.success("Subtask created successfully!");
                await loadSubtasks();
                setShowAddForm(false);
            }
        } catch (error: any) {
            console.error("Error creating subtask:", error);
            toast.error(error?.response?.data?.message || "Failed to create subtask");
        }
    };

    // Handle toggle subtask
    const handleToggle = async (subtaskId: string) => {
        try {
            const response = await toggleSubtask(subtaskId);
            if (response.success) {
                await loadSubtasks();
                // Don't reload entire task, just update local state
            }
        } catch (error: any) {
            console.error("Error toggling subtask:", error);
            toast.error(error?.response?.data?.message || "Failed to update subtask");
        }
    };

    // Handle delete subtask
    const handleDelete = async (subtaskId: string) => {
        const confirmed = await confirm({
            title: "Xóa Subtask",
            message: "Bạn có chắc chắn muốn xóa subtask này không? Hành động này không thể hoàn tác.",
            variant: "error",
            confirmText: "Xóa",
            cancelText: "Hủy",
        });

        if (!confirmed) return;

        try {
            const response = await deleteSubtask(subtaskId);
            if (response.success) {
                toast.success("Subtask deleted successfully!");
                await loadSubtasks();
            }
        } catch (error: any) {
            console.error("Error deleting subtask:", error);
            toast.error(error?.response?.data?.message || "Failed to delete subtask");
        }
    };

    // Handle update subtask
    const handleUpdate = async () => {
        await loadSubtasks();
        // Don't reload entire task, just update local state
    };

    return (
        <div className="subtask-list-container">
            <div className="subtask-header">
                <h3 className="subtask-title">
                    Subtasks
                    {progress.total > 0 && (
                        <span className="subtask-count">
                            {progress.completed}/{progress.total}
                        </span>
                    )}
                </h3>
                <button
                    className="btn-add-subtask"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? "Cancel" : "+ Add Subtask"}
                </button>
            </div>

            {/* Progress bar */}
            {progress.total > 0 && (
                <div className="subtask-progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress.percentage}% ` }}
                        />
                    </div>
                    <span className="progress-text">{progress.percentage}% Complete</span>
                </div>
            )}

            {/* Add subtask form */}
            {showAddForm && (
                <AddSubtaskForm
                    members={members}
                    onSubmit={handleAddSubtask}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* Subtask list */}
            {loading ? (
                <div className="subtask-loading">Loading subtasks...</div>
            ) : subtasks.length === 0 ? (
                <div className="subtask-empty">
                    No subtasks yet. Click "Add Subtask" to create one.
                </div>
            ) : (
                <div className="subtask-items">
                    {subtasks.map((subtask) => (
                        <SubtaskItem
                            key={subtask._id}
                            subtask={subtask}
                            members={members}
                            onToggle={handleToggle}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SubtaskList;
