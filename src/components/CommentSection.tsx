import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  createComment,
  fetchCommentsByTask,
  updateComment,
  deleteComment,
} from '../api/commentApi';
import { uploadFileToComment, downloadFile, deleteFileFromComment } from '../api/fileApi';
import { summarizeComments } from '../api/nlpApi';
import { socket } from '../socket';
import toast from 'react-hot-toast';
import { useModal } from './ModalProvider';

export interface TaskComment {
  _id: string;
  task_id: string;
  user_id:
    | string
    | {
        _id: string;
        username: string;
        full_name?: string;
        email?: string;
        avatar_url?: string;
      };
  content: string;
  created_at: string;
  updated_at: string;
  Collaboration?: string | null; // ID của comment cha (nếu là reply)
  attachments?: Array<{
    original_name: string;
    stored_name?: string;
    size?: number;
    mime_type?: string;
    uploaded_by?: string | { username: string; full_name?: string; _id?: string };
    uploaded_at?: string | Date;
    url?: string;
  }>;
}

interface CommentSectionProps {
  taskId: string;
  onCommentsUpdated?: (comments: TaskComment[]) => void;
}

const useSafeModal = () => {
  try {
    return useModal();
  } catch (err) {
    return null;
  }
};

const CommentSection: React.FC<CommentSectionProps> = ({
  taskId,
  onCommentsUpdated,
}) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<{
    summary?: string;
    keyPoints?: string[];
    decisions?: string[];
    actionItems?: string[];
    unresolvedIssues?: string[];
    participants?: string[];
    totalComments?: number;
  } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = localStorage.getItem('userId') || '';
  // Fallback to no-op modal in tests or when provider is absent
  const modalCtx = useSafeModal();
  const confirm = modalCtx?.confirm ?? (async () => false);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetchCommentsByTask(taskId);
      const fetchedComments: TaskComment[] = res?.data || [];

      // Debug log (an toàn, không lỗi undefined)
      console.log(
        'Loaded comments:',
        fetchedComments.map((c) => ({
          _id: c._id,
          content: c.content?.slice(0, 30) ?? '',
          Collaboration: c.Collaboration,
          collaborations: (c as any).collaborations,
        })),
      );

      setComments(fetchedComments);
      onCommentsUpdated?.(fetchedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
      onCommentsUpdated?.([]);
    }
  }, [taskId, onCommentsUpdated]);

  // Load comments
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Socket listener for real-time comment updates
  useEffect(() => {
    if (!socket || !taskId) return;

    const handleCommentCreated = (data: any) => {
      if (data.task_id === taskId) {
        toast.success(data.message || 'New comment added');
        loadComments();
      }
    };

    const handleCommentUpdated = (data: any) => {
      if (data.task_id === taskId) {
        toast(data.message || 'Bình luận đã được cập nhật');
        loadComments();
      }
    };

    const handleCommentDeleted = (data: any) => {
      if (data.task_id === taskId) {
        toast(data.message || 'Bình luận đã bị xóa');
        loadComments();
      }
    };

    socket.on('comment_created', handleCommentCreated);
    socket.on('comment_updated', handleCommentUpdated);
    socket.on('comment_deleted', handleCommentDeleted);

    return () => {
      socket.off('comment_created', handleCommentCreated);
      socket.off('comment_updated', handleCommentUpdated);
      socket.off('comment_deleted', handleCommentDeleted);
    };
  }, [taskId, loadComments]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    let createdCommentId: string | null = null;
    try {
      const commentContent = newComment.trim() ? newComment : `📎 Attached file: ${file.name}`;

      const createdCommentResponse = await createComment({
        task_id: taskId,
        content: commentContent,
        user_id: userId,
      });

      const createdComment = createdCommentResponse?.data;
      createdCommentId = createdComment?._id || createdComment?.id || null;

      if (!createdCommentId) {
        throw new Error('Không thể xác định comment vừa tạo để đính kèm file');
      }

      await uploadFileToComment(createdCommentId, file);

      setNewComment('');
      await loadComments();
      try {
        toast.success(`File "${file.name}" uploaded successfully!`);
      } catch {}
    } catch (err: any) {
      console.error('Upload error:', err);
      if (createdCommentId) {
        try {
          await deleteComment(createdCommentId);
        } catch (cleanupError) {
          console.error('Cleanup comment failed:', cleanupError);
        }
      }

      const errorMessage = err?.response?.data?.message || 'Unable to upload file!';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    fileInputRef.current?.click();
  };

  // Create comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await createComment({
        task_id: taskId,
        content: newComment,
        user_id: userId,
      });
      setNewComment('');
      loadComments();
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add reply to comment
  const handleAddReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) return;

    setLoading(true);
    try {
      console.log('Creating reply with parentCommentId:', parentCommentId);
      const result = await createComment({
        task_id: taskId,
        content: replyContent,
        user_id: userId,
        collaborations: parentCommentId, // Sử dụng field collaborations để trỏ đến comment cha
      });
      console.log('Reply created:', result);
      setReplyContent('');
      setReplyingToId(null);
      loadComments();
      toast.success('Đã trả lời bình luận');
    } catch (error) {
      console.error('Failed to add reply:', error);
      toast.error('Không thể trả lời bình luận');
    } finally {
      setLoading(false);
    }
  };

  // Summarize comments
  const handleSummarize = async () => {
    if (comments.length === 0) {
      toast.error('Không có comments để tóm tắt');
      return;
    }

    setIsSummarizing(true);
    try {
      const result = await summarizeComments(taskId);
      if (result.status === 'success' && result.data.success) {
        setSummary({
          summary: result.data.summary,
          keyPoints: result.data.keyPoints,
          decisions: result.data.decisions,
          actionItems: result.data.actionItems,
          unresolvedIssues: result.data.unresolvedIssues,
          participants: result.data.participants,
          totalComments: result.data.totalComments,
        });
        setShowSummary(true);
        toast.success('Đã tóm tắt comments thành công!');
      } else {
        toast.error(result.data.message || 'Không thể tóm tắt comments');
      }
    } catch (error: any) {
      console.error('Failed to summarize comments:', error);
      toast.error(error?.response?.data?.error || 'Không thể tóm tắt comments');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Update comment
  const handleUpdateComment = async (id: string) => {
    if (!editContent.trim()) return;

    setLoading(true);
    try {
      await updateComment(id, { content: editContent });
      setEditingId(null);
      setEditContent('');
      loadComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? This action cannot be undone.',
      variant: 'error',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteComment(id);
      loadComments();
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Unable to delete comment');
    } finally {
      setLoading(false);
    }
  };

  // Delete file from comment
  const handleDeleteFile = async (commentId: string, fileIndex: number, fileName: string) => {
    const confirmed = await confirm({
      title: 'Delete File',
      message: `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
      variant: 'error',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    setIsDeletingFile(true);
    try {
      await deleteFileFromComment(commentId, fileIndex);
      await loadComments();
      toast.success('File deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      toast.error(error?.response?.data?.message || 'Unable to delete file');
    } finally {
      setIsDeletingFile(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Group comments: parent comments và replies
  const groupComments = (comments: TaskComment[]) => {
    const parentComments: TaskComment[] = [];
    const repliesMap: Record<string, TaskComment[]> = {};

    comments.forEach((comment) => {
      // Kiểm tra cả Collaboration (chữ hoa) và collaborations (chữ thường) để tương thích
      const parentId = comment.Collaboration || (comment as any).collaborations;

      // Debug: Log để kiểm tra
      if (parentId) {
        console.log('Found reply:', {
          commentId: comment._id,
          parentId: parentId,
          parentIdType: typeof parentId,
        });
      }

      // Convert parentId sang string để so sánh
      const parentIdStr = parentId
        ? typeof parentId === 'object'
          ? parentId.toString()
          : String(parentId)
        : null;

      if (parentIdStr) {
        // Đây là reply
        if (!repliesMap[parentIdStr]) {
          repliesMap[parentIdStr] = [];
        }
        repliesMap[parentIdStr].push(comment);
      } else {
        // Đây là parent comment
        parentComments.push(comment);
      }
    });

    // Debug: Log kết quả group
    console.log('Grouped comments:', {
      parentCount: parentComments.length,
      repliesMapKeys: Object.keys(repliesMap),
      repliesCount: Object.values(repliesMap).reduce((sum, arr) => sum + arr.length, 0),
    });

    // Sort replies by created_at
    Object.keys(repliesMap).forEach((parentId) => {
      repliesMap[parentId].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });

    return { parentComments, repliesMap };
  };

  // Render single comment với replies
  const renderComment = (comment: TaskComment, isReply = false) => {
    const { repliesMap } = groupComments(comments);
    const commentIdStr =
      typeof comment._id === 'string'
        ? comment._id
        : (comment._id as any)?.toString?.() || String(comment._id);
    const replies = repliesMap[commentIdStr] || [];
    const commentUserId =
      typeof comment.user_id === 'object' ? comment.user_id._id : comment.user_id;
    const isOwner = commentUserId === userId;

    return (
      <div
        key={comment._id}
        style={{
          padding: '12px',
          background: isReply ? '#f0f0f0' : '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          marginLeft: isReply ? '24px' : '0',
          marginTop: isReply ? '8px' : '0',
        }}
      >
        {/* Comment header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            marginBottom: '8px',
          }}
        >
          <div>
            <span
              style={{
                fontWeight: 600,
                fontSize: '13px',
                color: '#2c3e50',
              }}
            >
              {(() => {
                const userObj = typeof comment.user_id === 'object' ? comment.user_id : null;
                if (userObj?.full_name) return userObj.full_name;
                if (userObj?.username) return userObj.username;
                return 'Unknown User';
              })()}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#95a5a6',
                marginLeft: '8px',
              }}
            >
              {formatDate(comment.created_at)}
            </span>
          </div>

          {/* Actions */}
          {isOwner && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setEditingId(comment._id);
                  setEditContent(comment.content);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#1a73e8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
                aria-label="Edit"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteComment(comment._id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ea4335',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
                aria-label="Delete"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Comment content */}
        {editingId === comment._id ? (
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '13px',
                resize: 'vertical',
                fontFamily: 'inherit',
                marginBottom: '8px',
              }}
            />
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditContent('');
                }}
                style={{
                  padding: '6px 12px',
                  background: 'white',
                  border: '1px solid #dadce0',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateComment(comment._id)}
                disabled={!editContent.trim() || loading}
                style={{
                  padding: '6px 12px',
                  background: editContent.trim() ? '#1a73e8' : '#dadce0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: editContent.trim() ? 'pointer' : 'not-allowed',
                }}
                aria-label="Save"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#5f6368',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {comment.content}
          </p>
        )}

        {/* Attachments section */}
        {comment.attachments && comment.attachments.length > 0 && (
          <div
            style={{
              marginTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {comment.attachments.map((file, fileIndex) => {
              const fileUrl = file.url
                ? file.url.startsWith('http')
                  ? file.url
                  : `http://localhost:3005${file.url}`
                : null;

              return (
                <div
                  key={fileIndex}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px',
                    background: 'white',
                    borderRadius: '4px',
                    border: '1px solid #e9ecef',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#5f6368' }}>
                      📎 {file.original_name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {fileUrl && (
                      <button
                        onClick={() =>
                          downloadFile(fileUrl, file.original_name || file.stored_name || 'file')
                        }
                        title="Download file"
                        style={{
                          padding: '4px 8px',
                          background: '#1a73e8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        Download
                      </button>
                    )}

                    {isOwner && (
                      <button
                        onClick={() =>
                          handleDeleteFile(comment._id, fileIndex, file.original_name || 'file')
                        }
                        disabled={isDeletingFile}
                        title="Delete file"
                        style={{
                          padding: '4px 8px',
                          background: '#ea4335',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: isDeletingFile ? 'not-allowed' : 'pointer',
                          opacity: isDeletingFile ? 0.7 : 1,
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reply button và reply input */}
        {!isReply && (
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={() => {
                if (replyingToId === comment._id) {
                  setReplyingToId(null);
                  setReplyContent('');
                } else {
                  setReplyingToId(comment._id);
                  setReplyContent('');
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#1a73e8',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '4px 8px',
                fontWeight: 500,
              }}
            >
              {replyingToId === comment._id ? 'Cancel' : 'Reply'}
            </button>

            {replyingToId === comment._id && (
              <div style={{ marginTop: '8px', marginLeft: '8px' }}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Viết trả lời..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    fontSize: '13px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    marginBottom: '8px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setReplyingToId(null);
                      setReplyContent('');
                    }}
                    style={{
                      padding: '6px 12px',
                      background: 'white',
                      border: '1px solid #dadce0',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddReply(comment._id)}
                    disabled={!replyContent.trim() || loading}
                    style={{
                      padding: '6px 12px',
                      background: replyContent.trim() ? '#1a73e8' : '#dadce0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: replyContent.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Render replies */}
        {replies.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            {replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        marginTop: '20px',
        borderTop: '1px solid #e8eaed',
        paddingTop: '16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>💬</span>
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: '#2c3e50',
            }}
          >
            Comments ({comments.length})
          </h4>
        </div>
      </div>

      {/* Summary Section */}
      {showSummary && summary && (
        <div
          style={{
            marginBottom: '16px',
            padding: '16px',
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <h5
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📊</span>
              Tóm tắt cuộc thảo luận
              {summary.totalComments && (
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#6c757d' }}>
                  ({summary.totalComments} comments)
                </span>
              )}
            </h5>
            <button
              onClick={() => setShowSummary(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#6c757d',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Đóng tóm tắt"
            >
              ×
            </button>
          </div>

          {summary.summary && (
            <div style={{ marginBottom: '16px' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#495057',
                }}
              >
                {summary.summary}
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <div>
                <h6
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#495057',
                  }}
                >
                  Điểm chính:
                </h6>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#6c757d' }}>
                  {summary.keyPoints.map((point, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.decisions && summary.decisions.length > 0 && (
              <div>
                <h6
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#28a745',
                  }}
                >
                  Quyết định:
                </h6>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#6c757d' }}>
                  {summary.decisions.map((decision, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      {decision}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.actionItems && summary.actionItems.length > 0 && (
              <div>
                <h6
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#007bff',
                  }}
                >
                  Hành động cần thực hiện:
                </h6>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#6c757d' }}>
                  {summary.actionItems.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.unresolvedIssues && summary.unresolvedIssues.length > 0 && (
              <div>
                <h6
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#dc3545',
                  }}
                >
                  Vấn đề chưa giải quyết:
                </h6>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#6c757d' }}>
                  {summary.unresolvedIssues.map((issue, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {summary.participants && summary.participants.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e9ecef' }}>
              <h6
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6c757d',
                }}
              >
                Người tham gia ({summary.participants.length}):
              </h6>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                {summary.participants.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add new comment */}
      <div style={{ marginBottom: '16px' }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          disabled={isUploading}
        />

        {/* Textarea container with relative positioning */}
        <div style={{ position: 'relative' }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              paddingRight: '40px', // Space for icon
              border: '1px solid #dadce0',
              borderRadius: '6px',
              fontSize: '13px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4285f4';
              e.target.style.boxShadow = '0 0 0 1px #4285f4';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#dadce0';
              e.target.style.boxShadow = 'none';
            }}
          />
          {/* Upload icon inside textarea */}
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="absolute bottom-2 right-2 flex items-center justify-center w-6 h-6 p-0 bg-transparent border-0 rounded cursor-pointer text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none"
            type="button"
            title="Đính kèm file"
            style={{ zIndex: 10 }}
          >
            {isUploading ? (
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416">
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
            ) : (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            )}
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginTop: '8px',
          }}
        >
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || loading}
            style={{
              padding: '8px 16px',
              background: newComment.trim() ? '#1a73e8' : '#dadce0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: newComment.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (newComment.trim()) e.currentTarget.style.background = '#1765cc';
            }}
            onMouseLeave={(e) => {
              if (newComment.trim()) e.currentTarget.style.background = '#1a73e8';
            }}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {comments.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '20px',
              color: '#95a5a6',
              fontSize: '13px',
            }}
          >
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
          >
            {(() => {
              const { parentComments } = groupComments(comments);
              return parentComments.map((comment) => renderComment(comment, false));
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
