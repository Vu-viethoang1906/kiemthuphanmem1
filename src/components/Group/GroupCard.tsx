import React from "react";

interface GroupCardProps {
  group: any;
  memberCount: number;
  userRole: string;
  onSelect: (group: any) => void;
  onDelete: (groupId: string) => void;
  onEdit?: (group: any) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  memberCount,
  userRole,
  onSelect,
  onDelete,
  onEdit,
}) => {
  const groupId = group._id || group.id;
  const canDelete = userRole === "Quản trị viên" || userRole === "Người tạo";
  const subtitle = group.description || "";
  const shortId = (groupId || "").slice(-6);
  const ownerName = group.owner?.name || group.owner_name || group.createdBy?.full_name || "";

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    if (role === "Người tạo" || role === "Creator") {
      return "bg-purple-100 text-purple-700";
    }
    if (role === "Quản trị viên" || role === "Administrator") {
      return "bg-blue-100 text-blue-700";
    }
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onSelect(group)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">
            {group.name}
          </h3>
          {userRole && (
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userRole)}`}>
              {userRole}
            </span>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 ml-2">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* Description */}
      {subtitle && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {subtitle}
        </p>
      )}

      {/* Info */}
      <div className="space-y-2 mb-4">
        {ownerName && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate">{ownerName}</span>
          </div>
        )}
        {shortId && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <span>ID: {shortId}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">{memberCount ?? 0} Members</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(group);
            }}
          >
            View
          </button>
          {canDelete && (
            <button
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(groupId);
              }}
              aria-label="Delete group"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
