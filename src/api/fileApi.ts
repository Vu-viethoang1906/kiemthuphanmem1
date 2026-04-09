import axiosInstance from "./axiosInstance";

const validateId = (id: string, name: string): void => {
  if (!id || typeof id !== "string") {
    throw new Error(`Invalid ${name}: must be a non-empty string`);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid ${name}: contains invalid characters`);
  }
  if (id.length > 100) {
    throw new Error(`Invalid ${name}: too long`);
  }
};

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 255);
};

export const getFilesByTask = async (taskId: string) => {
  validateId(taskId, "taskId");
  const res = await axiosInstance.get(
    `/files/task/${encodeURIComponent(taskId)}`
  );
  return res.data;
};

export const getFilesByComment = async (commentId: string) => {
  validateId(commentId, "commentId");
  const res = await axiosInstance.get(
    `/files/comment/${encodeURIComponent(commentId)}`
  );
  return res.data;
};

export const deleteFile = async (fileId: string) => {
  validateId(fileId, "fileId");
  const res = await axiosInstance.delete(
    `/files/${encodeURIComponent(fileId)}`
  );
  return res.data;
};

export const importFileTask = async (
  data: FormData,
  options?: { createNewBoard?: boolean; boardName?: string }
) => {
  if (!(data instanceof FormData)) {
    throw new Error("Invalid data: must be FormData");
  }
  const file = data.get("file") as File;
  if (file) {
    validateFile(file);
  }

  const res = await axiosInstance.post("/tasks/import", data, {
    params: {
      createNewBoard: options?.createNewBoard ? "true" : undefined,
      boardName: options?.boardName || undefined,
    },
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
];

const validateFile = (file: File): void => {
  if (!file || !(file instanceof File)) {
    throw new Error("Invalid file: must be a File object");
  }
  if (file.size === 0) {
    throw new Error("File is empty");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    );
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== "") {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "txt",
      "csv",
      "zip",
      "mp4",
      "mov",
      "mp3",
      "wav",
    ];
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new Error("File type not allowed");
    }
  }
  if (file.name.length > 255) {
    throw new Error("File name too long (max 255 characters)");
  }
};

export const uploadFileToTask = async (taskId: string, file: File) => {
  validateId(taskId, "taskId");
  validateFile(file);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axiosInstance.post(
      `/tasks/${encodeURIComponent(taskId)}/attachments`,
      formData
    );
    return res.data;
  } catch (error: any) {
    if (error?.response?.status === 413) {
      throw new Error("File too large");
    }
    throw error;
  }
};

export const uploadFileToComment = async (commentId: string, file: File) => {
  validateId(commentId, "commentId");
  validateFile(file);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axiosInstance.post(
      `/comments/${encodeURIComponent(commentId)}/attachment`,
      formData
    );
    return res.data;
  } catch (error: any) {
    if (error?.response?.status === 413) {
      throw new Error("File too large");
    }
    throw error;
  }
};

export const deleteFileFromTask = async (
  taskId: string,
  attachmentIndex: number
) => {
  validateId(taskId, "taskId");
  if (!Number.isInteger(attachmentIndex) || attachmentIndex < 0) {
    throw new Error("Invalid attachmentIndex: must be a non-negative integer");
  }

  try {
    const res = await axiosInstance.delete(
      `/tasks/${encodeURIComponent(
        taskId
      )}/attachments?attachmentIndex=${attachmentIndex}`,
      {
        data: { attachmentIndex },
      }
    );
    return res.data;
  } catch (error: any) {
    throw error;
  }
};

export const deleteFileFromComment = async (
  commentId: string,
  attachmentIndex: number
) => {
  validateId(commentId, "commentId");
  if (!Number.isInteger(attachmentIndex) || attachmentIndex < 0) {
    throw new Error("Invalid attachmentIndex: must be a non-negative integer");
  }

  try {
    const res = await axiosInstance.delete(
      `/comments/${encodeURIComponent(
        commentId
      )}/attachment?attachmentIndex=${attachmentIndex}`,
      {
        data: { attachmentIndex },
      }
    );
    return res.data;
  } catch (error: any) {
    throw error;
  }
};

const validateUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;
  if (url.includes("..") || url.includes("//") || url.includes("\\"))
    return false;
  if (url.length > 2000) return false;
  return true;
};

export const downloadFile = async (fileUrl: string, fileName: string) => {
  if (!validateUrl(fileUrl)) {
    throw new Error("Invalid file URL");
  }

  const sanitizedFileName = sanitizeFileName(fileName || "download");

  try {
    let fullUrl: string;
    const baseUrl =
      axiosInstance.defaults.baseURL || "http://localhost:3005/api";

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      const urlObj = new URL(fileUrl);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new Error("Invalid URL protocol");
      }
      fullUrl = fileUrl;
    } else if (fileUrl.startsWith("/uploads/")) {
      if (!validateUrl(fileUrl)) {
        throw new Error("Invalid file path");
      }
      fullUrl = `${baseUrl}${fileUrl}`;
    } else if (fileUrl.startsWith("/api/uploads/")) {
      if (!validateUrl(fileUrl)) {
        throw new Error("Invalid file path");
      }
      fullUrl = `${baseUrl}${fileUrl}`;
    } else {
      throw new Error("Invalid file URL format");
    }

    const token = localStorage.getItem("token");

    const response = await fetch(fullUrl, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download file: ${response.status} ${response.statusText}`
      );
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = sanitizedFileName;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    throw error;
  }
};
