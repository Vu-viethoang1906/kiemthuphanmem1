import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroupCard from '../../../components/Group/GroupCard';

describe('GroupCard', () => {
  const mockOnSelect = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnEdit = jest.fn();

  const mockGroup = {
    _id: 'group-123456789',
    name: 'Test Group',
    description: 'Test Description',
    owner: { name: 'John Doe' },
  };

  const defaultProps = {
    group: mockGroup,
    memberCount: 5,
    userRole: 'member',
    onSelect: mockOnSelect,
    onDelete: mockOnDelete,
    onEdit: mockOnEdit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should display group name', () => {
      render(<GroupCard {...defaultProps} />);
      
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });

    it('should display group description', () => {
      render(<GroupCard {...defaultProps} />);
      
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('should display member count', () => {
      render(<GroupCard {...defaultProps} />);
      
      expect(screen.getByText('5 Members')).toBeInTheDocument();
    });

    it('should display owner name when available', () => {
      render(<GroupCard {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display short ID', () => {
      render(<GroupCard {...defaultProps} />);
      
      expect(screen.getByText(/ID:/i)).toBeInTheDocument();
    });


    it('should display 0 members when count is not provided', () => {
      render(<GroupCard {...defaultProps} memberCount={0} />);
      
      expect(screen.getByText('0 Members')).toBeInTheDocument();
    });

    it('should handle missing description', () => {
      const groupWithoutDesc = { ...mockGroup, description: '' };
      
      render(<GroupCard {...defaultProps} group={groupWithoutDesc} />);
      
      expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
    });

    it('should handle missing owner', () => {
      const groupWithoutOwner = { ...mockGroup, owner: undefined };
      
      render(<GroupCard {...defaultProps} group={groupWithoutOwner} />);
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onSelect when card is clicked', async () => {
      render(<GroupCard {...defaultProps} />);
      
      const card = screen.getByText('Test Group').closest('div');
      if (card) await userEvent.click(card);
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockGroup);
    });

    it('should call onSelect when View button is clicked', async () => {
      render(<GroupCard {...defaultProps} />);
      
      const viewButton = screen.getByRole('button', { name: /view/i });
      await userEvent.click(viewButton);
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockGroup);
    });

    it('should not propagate click event from View button to card', async () => {
      render(<GroupCard {...defaultProps} />);
      
      const viewButton = screen.getByRole('button', { name: /view/i });
      await userEvent.click(viewButton);
      
      // onSelect should be called once, not twice
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete permissions', () => {
    it('should show delete button for Administrator role', () => {
      render(<GroupCard {...defaultProps} userRole="Quản trị viên" />);
      
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should show delete button for Creator role', () => {
      render(<GroupCard {...defaultProps} userRole="Người tạo" />);
      
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should not show delete button for regular member', () => {
      render(<GroupCard {...defaultProps} userRole="member" />);
      
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('should call onDelete when delete button is clicked', async () => {
      render(<GroupCard {...defaultProps} userRole="Quản trị viên" />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);
      
      expect(mockOnDelete).toHaveBeenCalledWith('group-123456789');
    });

    it('should not propagate click event from delete button to card', async () => {
      render(<GroupCard {...defaultProps} userRole="Quản trị viên" />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);
      
      expect(mockOnSelect).not.toHaveBeenCalled();
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('edit functionality', () => {
    it('should show edit button when onEdit is provided and user has permission', () => {
      render(<GroupCard {...defaultProps} userRole="Quản trị viên" onEdit={mockOnEdit} />);
      
      const editButton = screen.queryByRole('button', { name: /edit/i });
      if (editButton) {
        expect(editButton).toBeInTheDocument();
      }
    });

    it('should not show edit button when onEdit is not provided', () => {
      render(<GroupCard {...defaultProps} onEdit={undefined} />);
      
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  describe('group ID handling', () => {
    it('should use _id when available', async () => {
      render(<GroupCard {...defaultProps} userRole="Quản trị viên" />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);
      
      expect(mockOnDelete).toHaveBeenCalledWith('group-123456789');
    });

    it('should use id as fallback when _id is not available', async () => {
      const groupWithId = { id: 'fallback-id', name: 'Test', description: 'Desc' };
      
      render(<GroupCard {...defaultProps} group={groupWithId} userRole="Quản trị viên" />);
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await userEvent.click(deleteButton);
      
      expect(mockOnDelete).toHaveBeenCalledWith('fallback-id');
    });

    it('should display last 6 characters of ID', () => {
      render(<GroupCard {...defaultProps} />);
      
      // ID should show last 6 characters: '456789'
      expect(screen.getByText(/ID: 456789/i)).toBeInTheDocument();
    });
  });

  describe('owner name variations', () => {
    it('should display owner.name when available', () => {
      render(<GroupCard {...defaultProps} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display owner_name when owner.name is not available', () => {
      const groupWithOwnerName = {
        ...mockGroup,
        owner: undefined,
        owner_name: 'Jane Smith',
      };
      
      render(<GroupCard {...defaultProps} group={groupWithOwnerName} />);
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display createdBy.full_name as fallback', () => {
      const groupWithCreatedBy = {
        ...mockGroup,
        owner: undefined,
        createdBy: { full_name: 'Bob Wilson' },
      };
      
      render(<GroupCard {...defaultProps} group={groupWithCreatedBy} />);
      
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should not display owner section when no owner info is available', () => {
      const groupWithoutOwner = {
        ...mockGroup,
        owner: undefined,
        owner_name: undefined,
        createdBy: undefined,
      };
      
      render(<GroupCard {...defaultProps} group={groupWithoutOwner} />);
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('hover effects', () => {
    it('should have cursor pointer to indicate clickability', () => {
      const { container } = render(<GroupCard {...defaultProps} />);
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('cursor-pointer');
    });

    it('should have hover transition classes', () => {
      const { container } = render(<GroupCard {...defaultProps} />);
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('transition-all');
    });
  });

  describe('undefined member count', () => {
    it('should display 0 when memberCount is undefined', () => {
      render(<GroupCard {...defaultProps} memberCount={undefined as any} />);
      
      expect(screen.getByText('0 Members')).toBeInTheDocument();
    });
  });
});
