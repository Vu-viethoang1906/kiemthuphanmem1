import React from "react";
import "../../styles/BoardDetail/FilterDropdown.css";

interface FilterDropdownProps {
    show: boolean;
    allTags: any[];
    selectedFilterTagIds: string[];
    onToggleTag: (tagId: string) => void;
    onClearAll: () => void;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
    show,
    allTags,
    selectedFilterTagIds,
    onToggleTag,
    onClearAll,
    searchQuery = '',
    onSearchChange
}) => {
    if (!show) return null;

    // Filter tags based on search query
    const filteredTags = allTags.filter((tag: any) => 
        tag.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="filter-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="filter-header">
                <span className="filter-title">Filter by Tags</span>
                {selectedFilterTagIds.length > 0 && (
                    <button onClick={onClearAll} className="btn-clear-all">
                        Clear all
                    </button>
                )}
            </div>

            {/* Search Input */}
            {onSearchChange && (
                <div className="filter-search">
                    <input
                        type="text"
                        placeholder="Filter by Tags"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="filter-search-input"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
            
            {allTags.length === 0 ? (
                <div className="filter-empty">No tags available</div>
            ) : filteredTags.length === 0 ? (
                <div className="filter-empty">No tags match your search</div>
            ) : (
                <div className="filter-tags-list">
                    {filteredTags.map((tag: any) => {
                        const tagId = tag._id || tag.id;
                        const isSelected = selectedFilterTagIds.includes(tagId);
                        
                        return (
                            <div
                                key={tagId}
                                onClick={() => onToggleTag(tagId)}
                                className={`filter-tag-item ${isSelected ? 'selected' : ''}`}
                            >
                                <div className="filter-checkbox">
                                    {isSelected && (
                                        <svg
                                            className="checkbox-check-icon"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <div 
                                    className="filter-tag-color"
                                    style={{ background: tag.color || '#007bff' }}
                                />
                                <span className="filter-tag-name">{tag.name}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FilterDropdown;
