import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalProvider } from '../../../components/ModalProvider';

// API mocks
const mockFetchTemplates = jest.fn();
const mockCreateTemplate = jest.fn();
const mockUpdateTemplate = jest.fn();
const mockDeleteTemplate = jest.fn();
const mockFetchTemplateColumns = jest.fn();
const mockCreateTemplateColumn = jest.fn();
const mockUpdateTemplateColumn = jest.fn();
const mockDeleteTemplateColumn = jest.fn();
const mockFetchTemplateSwimlanes = jest.fn();
const mockCreateTemplateSwimlane = jest.fn();
const mockUpdateTemplateSwimlane = jest.fn();
const mockDeleteTemplateSwimlane = jest.fn();

jest.mock('../../../api/templateApi', () => ({
  __esModule: true,
  fetchTemplates: (...args: any[]) => mockFetchTemplates(...args),
  createTemplate: (...args: any[]) => mockCreateTemplate(...args),
  updateTemplate: (...args: any[]) => mockUpdateTemplate(...args),
  deleteTemplate: (...args: any[]) => mockDeleteTemplate(...args),
  fetchTemplateColumns: (...args: any[]) => mockFetchTemplateColumns(...args),
  createTemplateColumn: (...args: any[]) => mockCreateTemplateColumn(...args),
  updateTemplateColumn: (...args: any[]) => mockUpdateTemplateColumn(...args),
  deleteTemplateColumn: (...args: any[]) => mockDeleteTemplateColumn(...args),
  fetchTemplateSwimlanes: (...args: any[]) => mockFetchTemplateSwimlanes(...args),
  createTemplateSwimlane: (...args: any[]) => mockCreateTemplateSwimlane(...args),
  updateTemplateSwimlane: (...args: any[]) => mockUpdateTemplateSwimlane(...args),
  deleteTemplateSwimlane: (...args: any[]) => mockDeleteTemplateSwimlane(...args),
}));

// Hook mocks
const mockSetUrlState = jest.fn();
jest.mock('../../../hooks/useUrlState', () => ({
  useUrlState: () => [
    { page: '1', limit: '12', q: '', sortBy: 'created_at', sortOrder: 'desc' },
    mockSetUrlState,
  ],
}));

let mockSearchState = { searchValue: '', searchTerm: '' };
const mockHandleInputChange = jest.fn();
const mockHandleCompositionStart = jest.fn();
const mockHandleCompositionEnd = jest.fn();
jest.mock('../../../hooks/useVietnameseSearch', () => ({
  useVietnameseSearch: () => ({
    ...mockSearchState,
    handleInputChange: mockHandleInputChange,
    handleCompositionStart: mockHandleCompositionStart,
    handleCompositionEnd: mockHandleCompositionEnd,
  }),
}));

// DnD mocks
jest.mock('@dnd-kit/core', () => ({
  __esModule: true,
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  __esModule: true,
  arrayMove: jest.fn((arr, oldIndex, newIndex) => {
    const copy = [...arr];
    const [removed] = copy.splice(oldIndex, 1);
    copy.splice(newIndex, 0, removed);
    return copy;
  }),
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: jest.fn(),
  useSortable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: jest.fn(),
}));

// Grab the mocked module so we can reinforce return values after clearAllMocks
const mockedSortable = jest.requireMock('@dnd-kit/sortable') as { useSortable: jest.Mock };

jest.mock('@dnd-kit/utilities', () => ({
  __esModule: true,
  CSS: {
    Transform: {
      toString: jest.fn(() => ''),
    },
  },
}));

// Toast mock
const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: mockToast,
}));

// Modal mock: keep provider but stub confirm/show for deterministic flows
const mockConfirm = jest.fn();
const mockShow = jest.fn();
jest.mock('../../../components/ModalProvider', () => {
  const actual = jest.requireActual('../../../components/ModalProvider');
  return {
    __esModule: true,
    ...actual,
    useModal: () => ({ show: mockShow, confirm: mockConfirm }),
    ModalProvider: actual.ModalProvider,
  };
});

// Motion mock
jest.mock('framer-motion', () => ({
  __esModule: true,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const defaultTemplates = [
  { _id: 't1', name: 'Template 1', description: 'Desc 1', created_at: new Date().toISOString() },
  { _id: 't2', name: 'Template 2', description: 'Desc 2', created_at: new Date(Date.now() - 86400000).toISOString() },
];

const defaultColumns = [
  { _id: 'c1', name: 'Column 1', order: 1 },
  { _id: 'c2', name: 'Column 2', order: 2 },
];

const defaultSwimlanes = [
  { _id: 's1', name: 'Swimlane 1', order: 1 },
];

const renderPage = async () => {
  const { default: TemplateManagement } = await import('../../../pages/Template/TemplateManagement');
  return render(
    <ModalProvider>
      <TemplateManagement />
    </ModalProvider>
  );
};

describe('TemplateManagement critical flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
    mockedSortable.useSortable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    });
    mockSearchState = { searchValue: '', searchTerm: '' };
    mockFetchTemplates.mockResolvedValue(defaultTemplates);
    mockFetchTemplateColumns.mockResolvedValue(defaultColumns);
    mockFetchTemplateSwimlanes.mockResolvedValue(defaultSwimlanes);
    mockCreateTemplate.mockResolvedValue({});
    mockUpdateTemplate.mockResolvedValue({});
    mockCreateTemplateColumn.mockResolvedValue({});
    mockUpdateTemplateColumn.mockResolvedValue({});
    mockCreateTemplateSwimlane.mockResolvedValue({});
    mockUpdateTemplateSwimlane.mockResolvedValue({});
  });

  it('shows detail view and toggles tabs', async () => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    await renderPage();

    await waitFor(() => expect(screen.getByText('Template 1')).toBeInTheDocument(), { timeout: 8000 });
    await userEvent.click(screen.getByText('Template 1'));

    await screen.findByRole('button', { name: /Columns/i });
    expect(await screen.findByText('Column 1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Swimlanes/i }));
    expect(await screen.findByText('Swimlane 1')).toBeInTheDocument();
  });

  it('validates empty column creation', async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText('Template 1')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Template 1'));

    const addButton = await screen.findByRole('button', { name: /Add Column/i });
    await userEvent.click(addButton);

    const modalSubmit = screen.getAllByRole('button', { name: /Add Column/i }).find((btn) => btn.closest('[role="dialog"]'));
    expect(modalSubmit).toBeTruthy();
    if (modalSubmit) {
      await userEvent.click(modalSubmit);
    }

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please enter a column name!');
      expect(mockCreateTemplateColumn).not.toHaveBeenCalled();
    });
  });

  it('handles permission error (403) on load', async () => {
    mockFetchTemplates.mockRejectedValueOnce({ response: { status: 403 } });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  it('handles session expiration (401) on load', async () => {
    mockFetchTemplates.mockRejectedValueOnce({ response: { status: 401 } });

    await renderPage();

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Session expired. Please login again');
    });
  });

  it('saves inline column edit via Enter key', async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByText('Template 1')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Template 1'));

    await waitFor(() => expect(screen.getByText('Column 1')).toBeInTheDocument());

    const editButtons = screen.getAllByRole('button', { name: /Edit column/i });
    expect(editButtons.length).toBeGreaterThan(0);
    const editButton = editButtons[0];
    await userEvent.click(editButton);

    const input = await screen.findByDisplayValue('Column 1');
    await userEvent.clear(input);
    await userEvent.type(input, 'Updated Column');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(mockUpdateTemplateColumn).toHaveBeenCalledWith('c1', { name: 'Updated Column' }));
  });

  it('creates a template successfully from list view', async () => {
    await renderPage();
    await screen.findByText('Template 1');

    await userEvent.click(screen.getByRole('button', { name: /New Template/i }));

    const nameInput = await screen.findByPlaceholderText(/Enter template name/i);
    const descInput = screen.getByPlaceholderText(/Enter template description/i);
    await userEvent.type(nameInput, 'Brand New');
    await userEvent.type(descInput, 'Fresh');

    await userEvent.click(screen.getByRole('button', { name: /Create Template/i }));

    await waitFor(() => {
      expect(mockCreateTemplate).toHaveBeenCalledWith({ name: 'Brand New', description: 'Fresh' });
      expect(mockToast.success).toHaveBeenCalledWith('Template created successfully!');
    });
  });

  it('shows validation error when creating template without name', async () => {
    await renderPage();
    await screen.findByText('Template 1');

    await userEvent.click(screen.getByRole('button', { name: /New Template/i }));
    await userEvent.click(await screen.findByRole('button', { name: /Create Template/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please enter a template name!');
      expect(mockCreateTemplate).not.toHaveBeenCalled();
    });
  });

  it('edits a template from list card', async () => {
    await renderPage();
    await screen.findByText('Template 1');

    const editButtons = screen.getAllByTitle(/Edit/i);
    await userEvent.click(editButtons[0]);

    const nameInput = await screen.findByDisplayValue('Template 1');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Template 1 Updated');

    const descInput = screen.getByDisplayValue('Desc 1');
    await userEvent.clear(descInput);
    await userEvent.type(descInput, 'New description');

    await userEvent.click(screen.getByRole('button', { name: /Update Template/i }));

    await waitFor(() => {
      expect(mockUpdateTemplate).toHaveBeenCalledWith('t1', {
        name: 'Template 1 Updated',
        description: 'New description',
      });
      expect(mockToast.success).toHaveBeenCalledWith('Template updated successfully!');
    });
  });

  it('deletes a template after confirmation', async () => {
    mockConfirm.mockResolvedValueOnce(true);

    await renderPage();
    await screen.findByText('Template 1');

    const deleteButtons = screen.getAllByTitle(/Delete/i);
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(mockDeleteTemplate).toHaveBeenCalledWith('t1');
      expect(mockToast.success).toHaveBeenCalledWith('Template deleted successfully!');
    });
  });

  it('filters templates by search term', async () => {
    mockSearchState = { searchValue: 'Template 2', searchTerm: 'Template 2' };

    await renderPage();

    await waitFor(() => {
      expect(screen.queryByText('Template 1')).not.toBeInTheDocument();
      expect(screen.getByText('Template 2')).toBeInTheDocument();
    });
  });

  it('adds a column from the modal', async () => {
    await renderPage();
    await userEvent.click(await screen.findByText('Template 1'));
    await screen.findByText('Column 1');

    await userEvent.click(screen.getByRole('button', { name: /Add Column/i }));
    const columnInput = await screen.findByPlaceholderText(/Enter column name/i);
    await userEvent.type(columnInput, 'New Column');
    await userEvent.click(screen.getAllByRole('button', { name: /Add Column/i }).find((btn) => btn.closest('[role="dialog"]'))!);

    await waitFor(() => {
      expect(mockCreateTemplateColumn).toHaveBeenCalledWith({ template_id: 't1', name: 'New Column', order: 3 });
      expect(mockToast.success).toHaveBeenCalledWith('Column created successfully!');
    });
  });

  it('adds a swimlane from the modal', async () => {
    await renderPage();
    await userEvent.click(await screen.findByText('Template 1'));
    await userEvent.click(screen.getByRole('button', { name: /Swimlanes/i }));
    await screen.findByText('Swimlane 1');

    await userEvent.click(screen.getByRole('button', { name: /Add Swimlane/i }));
    const swimlaneInput = await screen.findByPlaceholderText(/Enter swimlane name/i);
    await userEvent.type(swimlaneInput, 'New Swimlane');
    await userEvent.click(screen.getAllByRole('button', { name: /Add Swimlane/i }).find((btn) => btn.closest('[role="dialog"]'))!);

    await waitFor(() => {
      expect(mockCreateTemplateSwimlane).toHaveBeenCalledWith({ template_id: 't1', name: 'New Swimlane', order: 2 });
      expect(mockToast.success).toHaveBeenCalledWith('Swimlane created successfully!');
    });
  });

  it('deletes a column after confirmation', async () => {
    mockConfirm.mockResolvedValueOnce(true);

    await renderPage();
    await userEvent.click(await screen.findByText('Template 1'));
    await screen.findByText('Column 1');

    const deleteButtons = screen.getAllByLabelText(/Delete column/i);
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(mockDeleteTemplateColumn).toHaveBeenCalledWith('c1');
      expect(mockToast.success).toHaveBeenCalledWith('Column deleted successfully!');
    });
  });
});

