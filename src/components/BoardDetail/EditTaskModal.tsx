import React, { useCallback, useEffect, useRef, useState } from "react";
import "../../styles/BoardDetail/CreateTaskModal.css";
import CommentSection, { TaskComment } from "../CommentSection";
import SubtaskList from "./SubtaskList";
import { downloadFile, deleteFileFromTask, uploadFileToTask } from "../../api/fileApi";
import {
  isoToDateTimeLocal,
  datetimeLocalToISO,
} from "../../utils/datetimeUtils";
import { useModal } from "../ModalProvider";
import toast from "react-hot-toast";
import { getAIRecommendations, LearningResource } from "../../api/learningResourceApi";
import { Loader2, BookOpen, Video, Code, ExternalLink } from "lucide-react";

type Task = {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  column_id: string;
  swimlane_id?: string;
  assigned_to?: {
    username: string;
    full_name?: string;
    _id?: string;
    id?: string;
  };
  priority?: string;
  status?: string;
  start_date?: string;
  due_date?: string;
  estimate_hours?: number;
  created_by?: string | { username: string; full_name?: string; _id?: string };
  created_at?: string;
  updated_at?: string;
  tags?: any[];
  attachments?: Array<{
    original_name: string;
    stored_name?: string;
    size?: number;
    mime_type?: string;
    uploaded_by?:
    | { username: string; full_name?: string; _id?: string }
    | string;
    uploaded_at?: string | Date;
    url?: string;
  }>;
};

type CommentAttachment = NonNullable<TaskComment["attachments"]>[number];

interface CommentedFile extends CommentAttachment {
  commentId: string;
  attachmentIndex: number;
  commenterName: string;
  commentCreatedAt?: string;
}

interface EditTaskModalProps {
  show: boolean;
  editingTask: Task | null;
  board: any;
  columns: any[];
  swimlanes: any[];
  allTags: any[];
  taskTags: any[];
  tagSearchInput: string;
  selectedTagId: string;
  boardMembers: any[];
  isLoading?: boolean;
  onClose: () => void;
  onTaskChange: (task: Task) => void;
  onTagSearchChange: (search: string) => void;
  onTagSelect: (tagId: string, tagName: string) => void;
  onRemoveTag: (tagId: string) => void;
  onUpdate: () => void;
  onDelete: (taskId: string, taskTitle: string) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  show,
  editingTask,
  board,
  columns,
  swimlanes,
  allTags,
  taskTags,
  tagSearchInput,
  selectedTagId,
  boardMembers,
  isLoading = false,
  onClose,
  onTaskChange,
  onTagSearchChange,
  onTagSelect,
  onRemoveTag,
  onUpdate,
  onDelete,
}) => {
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [commentedFiles, setCommentedFiles] = useState<CommentedFile[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [learningResources, setLearningResources] = useState<{
    tutorials: Array<{ title: string; url: string; type?: string }>;
    videos: Array<{ title: string; url: string }>;
    codeExamples: Array<{ title: string; language: string; snippet: string }>;
  } | null>(null);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [showLearningResources, setShowLearningResources] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { confirm } = useModal();

  const taskIdentity = editingTask?._id || editingTask?.id || "";

  useEffect(() => {
    setCommentedFiles([]);
    setLearningResources(null);
    setShowLearningResources(false);
  }, [taskIdentity]);

  // Load learning resources when user toggles showLearningResources
  useEffect(() => {
    const loadLearningResources = async () => {
      if (!showLearningResources) return;

      if (!editingTask?._id && !editingTask?.id) {
        setLearningResources(null);
        return;
      }

      if (!learningResources && !isLoadingResources) {
        setIsLoadingResources(true);
        try {
          const taskId = editingTask._id || editingTask.id;
          if (!taskId) {
            setIsLoadingResources(false);
            return;
          }
          const result = await getAIRecommendations(taskId, true);

          if (result.success) {
            setLearningResources({
              tutorials: result.tutorials || [],
              videos: result.videos || [],
              codeExamples: result.codeExamples || [],
            });
          }
        } catch (error: any) {
          console.error("Error loading learning resources:", error);
          toast.error("Không thể tải tài liệu học tập");
        } finally {
          setIsLoadingResources(false);
        }
      }
    };

    loadLearningResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLearningResources]);

  const handleCommentsUpdated = useCallback(
    (incomingComments: TaskComment[]) => {
      const mapped: CommentedFile[] = [];

      incomingComments.forEach((comment) => {
        const commenter =
          typeof comment.user_id === "object" ? comment.user_id : null;
        const commenterName =
          commenter?.full_name || commenter?.username || "Unknown";
        const attachments = comment.attachments || [];

        attachments.forEach(
          (attachment: CommentAttachment, attachmentIndex: number) => {
            if (!attachment) return;
            mapped.push({
              ...attachment,
              commentId: comment._id,
              attachmentIndex,
              commenterName,
              commentCreatedAt: comment.created_at,
            });
          }
        );
      });

      setCommentedFiles(mapped);
    },
    []
  );

  useEffect(() => {
    setCommentedFiles([]);
  }, [taskIdentity]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  if (!show || !editingTask) return null;

  const filteredTags = allTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchInput.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-40">
            <div className="flex items-center gap-3 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Đang tải dữ liệu task...</span>
            </div>
          </div>
        )}

        {/* Close button - outside of scrollable content */}
        <button
          type="button"
          className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all duration-200 z-50"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Body - Grid Layout */}
        <div className="flex-1 grid grid-cols-3 gap-6 p-6 overflow-hidden">
          {/* Left Column - Form Fields (2/3) */}
          <div className="col-span-2 space-y-5 overflow-y-auto pr-2">
            {/* Title */}
            <div>
              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
              </div>
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) =>
                  onTaskChange({ ...editingTask, title: e.target.value })
                }
                placeholder="Enter task title"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={6}
                value={editingTask.description || ""}
                onChange={(e) =>
                  onTaskChange({ ...editingTask, description: e.target.value })
                }
                placeholder="Add task description..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 resize-none"
              />
            </div>

            {/* Subtask Section */}
            {(editingTask._id || editingTask.id) && (
              <SubtaskList
                taskId={(editingTask._id || editingTask.id) as string}
                members={boardMembers}
              />
            )}


            {/* Assigned To & Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assigned To
                </label>
                <select
                  value={
                    editingTask.assigned_to?._id ||
                    editingTask.assigned_to?.id ||
                    ""
                  }
                  onChange={(e) => {
                    const selectedUserId = e.target.value;
                    if (selectedUserId) {
                      const selectedMember = boardMembers.find((m) => {
                        const memberId =
                          m.user_id?._id || m.user_id?.id || m.user_id;
                        return memberId === selectedUserId;
                      });
                      if (selectedMember) {
                        const userData = selectedMember.user_id;
                        onTaskChange({
                          ...editingTask,
                          assigned_to: {
                            _id: userData._id || userData.id,
                            username: userData.username,
                            full_name: userData.full_name,
                          },
                        });
                      }
                    } else {
                      onTaskChange({ ...editingTask, assigned_to: undefined });
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {boardMembers.map((member: any) => {
                    const userId =
                      member.user_id?._id ||
                      member.user_id?.id ||
                      member.user_id;
                    const userData = member.user_id;
                    const displayName =
                      userData?.full_name || userData?.username || "Unknown";
                    return (
                      <option key={userId} value={userId}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>

                {/* Attached Files Section */}
                {editingTask.attachments &&
                  editingTask.attachments.length > 0 && (
                    <div className="mt-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Attached Files
                      </label>
                      <div className="space-y-2">
                        {editingTask.attachments.map((file, index) => {
                          const uploadedBy =
                            typeof file.uploaded_by === "object"
                              ? file.uploaded_by
                              : null;
                          const uploaderName =
                            uploadedBy?.full_name ||
                            uploadedBy?.username ||
                            "Unknown";
                          const fileUrl = file.url
                            ? file.url.startsWith("http")
                              ? file.url
                              : `http://localhost:3005${file.url}`
                            : null;

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <svg
                                  className="w-5 h-5 text-gray-500 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {file.original_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Uploaded by {uploaderName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {fileUrl && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      downloadFile(
                                        file.url || fileUrl,
                                        file.original_name
                                      ).catch((err) => {
                                        console.error("Download failed:", err);
                                        alert(
                                          "Unable to download file. Please try again."
                                        );
                                      });
                                    }}
                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                    title="Download file"
                                    type="button"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                      />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    const confirmed = await confirm({
                                      title: "Delete File",
                                      message: `Are you sure you want to delete "${file.original_name}"? This action cannot be undone.`,
                                      variant: "error",
                                      confirmText: "Delete",
                                      cancelText: "Cancel",
                                    });

                                    if (!confirmed || !editingTask) return;

                                    const taskId =
                                      editingTask._id || editingTask.id;
                                    if (!taskId) return;

                                    setIsDeletingFile(true);
                                    try {
                                      await deleteFileFromTask(taskId, index);
                                      const updatedAttachments = [
                                        ...(editingTask.attachments || []),
                                      ];
                                      updatedAttachments.splice(index, 1);
                                      onTaskChange({
                                        ...editingTask,
                                        attachments: updatedAttachments,
                                      });
                                      toast.success(
                                        "File deleted successfully"
                                      );
                                    } catch (err: any) {
                                      console.error("Delete failed:", err);
                                      toast.error(
                                        err?.response?.data?.message ||
                                        "Unable to delete file"
                                      );
                                    } finally {
                                      setIsDeletingFile(false);
                                    }
                                  }}
                                  disabled={isDeletingFile}
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete file"
                                  type="button"
                                >
                                  <svg
                                    className="w-4 h-4"
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
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Commented Files
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (fileInputRef.current && !isUploadingFile) {
                          fileInputRef.current.click();
                        }
                      }}
                      disabled={isUploadingFile || (!editingTask._id && !editingTask.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Upload file to task"
                    >
                      {isUploadingFile ? (
                        <>
                          <svg
                            className="w-3.5 h-3.5 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              strokeDasharray="31.416"
                              strokeDashoffset="31.416"
                            >
                              <animate
                                attributeName="stroke-dasharray"
                                dur="2s"
                                values="0 31.416;15.708 15.708;0 31.416;0 31.416"
                                repeatCount="indefinite"
                              />
                              <animate
                                attributeName="stroke-dashoffset"
                                dur="2s"
                                values="0;-15.708;-31.416;-31.416"
                                repeatCount="indefinite"
                              />
                            </circle>
                          </svg>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>Upload File</span>
                        </>
                      )}
                    </button>
                  </div>
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !editingTask) return;

                      const taskId = editingTask._id || editingTask.id;
                      if (!taskId) {
                        toast.error("Task ID not found!");
                        return;
                      }

                      setIsUploadingFile(true);
                      try {
                        await uploadFileToTask(taskId, file);
                        toast.success(`File "${file.name}" uploaded successfully!`);

                        // Reload task to show updated attachments
                        if (onUpdate) {
                          // Trigger a reload by calling onUpdate
                          // But first we need to update the task state
                          // Since we don't have direct access to reload, we'll trigger onUpdate
                          // The parent component should handle reloading the task
                          setTimeout(() => {
                            onUpdate();
                          }, 500);
                        }
                      } catch (err: any) {
                        console.error("Upload error:", err);
                        toast.error(
                          err?.response?.data?.message ||
                          err?.message ||
                          "Failed to upload file"
                        );
                      } finally {
                        setIsUploadingFile(false);
                        // Reset file input
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }
                    }}
                    disabled={isUploadingFile}
                  />
                  {commentedFiles.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No files have been uploaded via comments.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {commentedFiles.map((file) => {
                        const fileUrl = file.url
                          ? file.url.startsWith("http")
                            ? file.url
                            : `http://localhost:3005${file.url}`
                          : null;
                        const key = `${file.commentId}-${file.attachmentIndex
                          }-${file.stored_name || file.original_name}`;

                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <svg
                                className="w-5 h-5 text-gray-500 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {file.original_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Commented by {file.commenterName}
                                  {file.commentCreatedAt &&
                                    ` • ${new Date(
                                      file.commentCreatedAt
                                    ).toLocaleString("en-US")}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {fileUrl && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    downloadFile(
                                      file.url || fileUrl,
                                      file.original_name
                                    ).catch((err) => {
                                      console.error("Download failed:", err);
                                      alert(
                                        "Unable to download file. Please try again."
                                      );
                                    });
                                  }}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="Download file"
                                  type="button"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tags
                </label>

                <div className="space-y-3">
                  {taskTags.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Selected Tags ({taskTags.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {taskTags.map((tag: any) => (
                          <div
                            key={tag._id || tag.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white font-medium text-sm shadow-sm"
                            style={{ background: tag.color || "#007bff" }}
                          >
                            <span>{tag.name}</span>
                            <button
                              type="button"
                              onClick={() => onRemoveTag(tag._id || tag.id)}
                              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                              title="Remove tag"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={tagSearchInput}
                    onFocus={() => {
                      if (blurTimeoutRef.current) {
                        clearTimeout(blurTimeoutRef.current);
                        blurTimeoutRef.current = null;
                      }
                      setIsTagInputFocused(true);
                    }}
                    onBlur={() => {
                      blurTimeoutRef.current = setTimeout(() => {
                        setIsTagInputFocused(false);
                      }, 120);
                    }}
                    onChange={(e) => onTagSearchChange(e.target.value)}
                    placeholder="Search tags or type new tag name..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                  />

                  {isTagInputFocused && tagSearchInput.trim() !== "" && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Available Tags ({filteredTags.length})
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-gray-200">
                        {filteredTags.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-gray-500 text-center">
                            No matching tags
                          </div>
                        ) : (
                          filteredTags.map((tag: any) => {
                            const tagId = tag._id || tag.id;
                            const isSelected =
                              selectedTagId === tagId ||
                              taskTags.some((t) => (t._id || t.id) === tagId);
                            return (
                              <button
                                key={tagId}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => onTagSelect(tagId, tag.name)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${isSelected
                                  ? "bg-blue-50 text-blue-600 font-semibold"
                                  : "hover:bg-gray-50 text-gray-700"
                                  }`}
                              >
                                <span
                                  className="w-3 h-3 rounded-full border border-gray-200"
                                  style={{ background: tag.color || "#007bff" }}
                                />
                                <span className="flex-1">{tag.name}</span>
                                {isSelected && (
                                  <span className="text-xs">✓</span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {isTagInputFocused && tagSearchInput.trim() !== "" && (
                    <div className="text-xs text-gray-500">
                      {selectedTagId
                        ? "✓ Tag selected from list"
                        : tagSearchInput &&
                          !allTags.find(
                            (t) =>
                              t.name.toLowerCase() ===
                              tagSearchInput.toLowerCase()
                          )
                          ? `➕ New tag "${tagSearchInput}" will be created`
                          : "Select a tag or type a new name"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Priority & Estimate Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={editingTask.priority || ""}
                  onChange={(e) =>
                    onTaskChange({ ...editingTask, priority: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 bg-white cursor-pointer"
                >
                  <option value="">Select Priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estimate Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={editingTask.estimate_hours || ""}
                  onChange={(e) =>
                    onTaskChange({
                      ...editingTask,
                      estimate_hours: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="0.0"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Start Date & Time & Due Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={isoToDateTimeLocal(editingTask.start_date)}
                  onChange={(e) => {
                    const isoValue = datetimeLocalToISO(e.target.value);
                    onTaskChange({
                      ...editingTask,
                      start_date: isoValue || undefined,
                    });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 cursor-pointer"
                  placeholder="Select start date and time"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={isoToDateTimeLocal(editingTask.due_date)}
                  onChange={(e) => {
                    const isoValue = datetimeLocalToISO(e.target.value);
                    onTaskChange({
                      ...editingTask,
                      due_date: isoValue || undefined,
                    });
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-gray-900 cursor-pointer"
                  placeholder="Select due date and time"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Task Information & Comments (1/3) */}
          <div className="col-span-1 space-y-5 overflow-y-auto pl-2">
            {/* Task Information */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 mb-3">
                Task Information
              </h4>
              <div className="space-y-2">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Board
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {board?.title || "N/A"}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Column
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {columns.find(
                      (c) => (c.id || c._id) === editingTask.column_id
                    )?.name || "N/A"}
                  </div>
                </div>

                {editingTask.swimlane_id && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Swimlane
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {swimlanes.find(
                        (s) => (s.id || s._id) === editingTask.swimlane_id
                      )?.name || "N/A"}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Created by
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {typeof editingTask.created_by === "object"
                      ? editingTask.created_by?.full_name ||
                      editingTask.created_by?.username
                      : "N/A"}
                  </div>
                </div>

                {editingTask.created_at && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Created
                    </div>
                    <div className="text-sm font-medium text-indigo-600">
                      {new Date(editingTask.created_at).toLocaleString("en-US")}
                    </div>
                  </div>
                )}

                {editingTask.updated_at && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Updated
                    </div>
                    <div className="text-sm font-medium text-indigo-600">
                      {new Date(editingTask.updated_at).toLocaleString("en-US")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Learning Resources Section */}
            {editingTask._id || editingTask.id ? (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Tài liệu học tập liên quan
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLearningResources(!showLearningResources)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 text-xs font-semibold rounded-lg transition-all duration-200"
                    title="Toggle learning resources"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{showLearningResources ? "Ẩn" : "Hiện"} tài liệu</span>
                  </button>
                </div>

                {showLearningResources && (
                  <div className="space-y-4">
                    {isLoadingResources ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="ml-2 text-sm text-gray-600">Đang tải tài liệu...</span>
                      </div>
                    ) : learningResources ? (
                      <>
                        {/* Tutorials */}
                        {learningResources.tutorials && learningResources.tutorials.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                              <h4 className="text-sm font-semibold text-blue-900">Tutorials & Articles</h4>
                            </div>
                            <div className="space-y-2">
                              {learningResources.tutorials.map((tutorial, index) => (
                                <a
                                  key={index}
                                  href={tutorial.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-2 bg-white rounded hover:bg-blue-50 transition-colors group"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {tutorial.title}
                                    </p>
                                    {tutorial.type && (
                                      <p className="text-xs text-gray-500">{tutorial.type}</p>
                                    )}
                                  </div>
                                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-2" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Videos */}
                        {learningResources.videos && learningResources.videos.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Video className="w-4 h-4 text-red-600" />
                              <h4 className="text-sm font-semibold text-red-900">Videos</h4>
                            </div>
                            <div className="space-y-2">
                              {learningResources.videos.map((video, index) => (
                                <a
                                  key={index}
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-2 bg-white rounded hover:bg-red-50 transition-colors group"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {video.title}
                                    </p>
                                  </div>
                                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-red-600 flex-shrink-0 ml-2" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Code Examples */}
                        {learningResources.codeExamples && learningResources.codeExamples.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="w-4 h-4 text-green-600" />
                              <h4 className="text-sm font-semibold text-green-900">Code Examples</h4>
                            </div>
                            <div className="space-y-3">
                              {learningResources.codeExamples.map((example, index) => (
                                <div
                                  key={index}
                                  className="p-3 bg-white rounded border border-green-200"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-gray-900">
                                      {example.title}
                                    </p>
                                    {example.language && (
                                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                        {example.language}
                                      </span>
                                    )}
                                  </div>
                                  {example.snippet && (
                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                      <code>{example.snippet}</code>
                                    </pre>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!learningResources.tutorials?.length &&
                          !learningResources.videos?.length &&
                          !learningResources.codeExamples?.length) && (
                            <div className="text-center py-6 text-sm text-gray-500">
                              Không tìm thấy tài liệu học tập liên quan
                            </div>
                          )}
                      </>
                    ) : (
                      <div className="text-center py-6 text-sm text-gray-500">
                        Nhấn "Hiện tài liệu" để xem các tài liệu học tập được đề xuất
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Comment Section */}
            <div className="comment-section">
              {editingTask._id && (
                <CommentSection
                  taskId={editingTask._id}
                  onCommentsUpdated={handleCommentsUpdated}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => {
              const taskId = editingTask._id || editingTask.id || "";
              onDelete(taskId, editingTask.title);
            }}
            className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Delete
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onUpdate}
              disabled={!editingTask.title}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTaskModal;
