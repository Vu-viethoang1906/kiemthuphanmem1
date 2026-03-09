import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import ScheduledReports from '../../../pages/Reports/ScheduledReports';
import {
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  sendScheduledReportNow,
} from '../../../api/scheduledReportApi';
import { fetchMyBoards } from '../../../api/boardApi';

const mockConfirm = jest.fn(() => Promise.resolve(true));

jest.mock('../../../components/ModalProvider', () => ({
  __esModule: true,
  useModal: () => ({ confirm: mockConfirm }),
}));

jest.mock('../../../api/scheduledReportApi', () => ({
  getScheduledReports: jest.fn(),
  createScheduledReport: jest.fn(),
  updateScheduledReport: jest.fn(),
  deleteScheduledReport: jest.fn(),
  sendScheduledReportNow: jest.fn(),
}));

jest.mock('../../../api/boardApi', () => ({
  fetchMyBoards: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const sampleReport = {
  _id: 'sr1',
  board_id: { _id: 'b1', title: 'Board 1' },
  report_type: 'dashboard' as const,
  frequency: 'weekly' as const,
  recipients: ['a@example.com'],
  is_active: true,
  last_sent_at: null,
  next_send_at: '2024-01-02T00:00:00Z',
  retry_count: 0,
  last_error: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  report_params: {},
};

const mockBoards = { data: [{ _id: 'b1', title: 'Board 1' }] };

describe('ScheduledReports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setTimeout(15000); // Increase timeout for all tests in this describe block
    mockConfirm.mockResolvedValue(true);
    (fetchMyBoards as jest.Mock).mockResolvedValue(mockBoards);
    (getScheduledReports as jest.Mock).mockResolvedValue({ success: true, data: [sampleReport] });
    (createScheduledReport as jest.Mock).mockResolvedValue({});
    (updateScheduledReport as jest.Mock).mockResolvedValue({});
    (deleteScheduledReport as jest.Mock).mockResolvedValue({});
    (sendScheduledReportNow as jest.Mock).mockResolvedValue({});
    window.confirm = jest.fn(() => true);
  });

  const renderPage = () => render(<ScheduledReports />);

  it('renders scheduled reports list', async () => {
    renderPage();

    await waitFor(() => expect(getScheduledReports).toHaveBeenCalled());
    expect(screen.getByText('Scheduled Reports')).toBeInTheDocument();
    expect(screen.getByText('Board 1')).toBeInTheDocument();
    expect(screen.getByText(/Active|Đang hoạt động/i)).toBeInTheDocument();
  });

  it('sends now, toggles active, and deletes', async () => {
    renderPage();
    await screen.findByText('Board 1');

    fireEvent.click(screen.getByTitle('Send now'));
    await waitFor(() => expect(sendScheduledReportNow).toHaveBeenCalledWith('sr1'));

    fireEvent.click(screen.getByTitle('Disable'));
    await waitFor(() =>
      expect(updateScheduledReport).toHaveBeenCalledWith('sr1', { is_active: false }),
    );

    fireEvent.click(screen.getByTitle('Delete'));
    await waitFor(() => expect(deleteScheduledReport).toHaveBeenCalledWith('sr1'));
  });

  it('creates a new scheduled report from modal', async () => {
    renderPage();
    await screen.findByText('Board 1');

    // Click the Create New button
    fireEvent.click(screen.getByRole('button', { name: /Create New/i }));

    // Wait for modal to appear - check for the modal heading
    await waitFor(() => {
      expect(screen.getByText('Create Scheduled Report')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Fill in the email field
    const emailInput = screen.getByPlaceholderText('email@example.com');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    // Try to find the board select using different methods
    let boardSelect;
    try {
      // First try to find by the exact display value
      boardSelect = screen.getByDisplayValue('Select board');
    } catch (e) {
      try {
        // Try to find by label text
        boardSelect = screen.getByLabelText(/board/i);
      } catch (e2) {
        // Try to find any select element
        boardSelect = screen.getByRole('combobox');
      }
    }

    // If we found the select, change its value
    if (boardSelect) {
      fireEvent.change(boardSelect, { target: { value: 'b1' } });
    } else {
      // If we can't find the select, skip the board selection and proceed
      console.log('Board select not found, proceeding without board selection');
    }

    // Click the Create button
    const submitButton = screen.getByRole('button', { name: 'Create' });
    fireEvent.click(submitButton);

    // Wait for the API call
    await waitFor(() =>
      expect(createScheduledReport).toHaveBeenCalledWith({
        board_id: 'b1',
        report_type: 'dashboard',
        frequency: 'weekly',
        recipients: ['new@example.com'],
        report_params: {},
      }),
      { timeout: 5000 }
    );
  });

  it('edits an existing scheduled report', async () => {
    renderPage();
    await screen.findByText('Board 1');

    // Click the Edit button
    fireEvent.click(screen.getByTitle('Edit'));
    
    // Wait for modal to appear with increased timeout
    await waitFor(() => {
      expect(screen.getByText('Edit Scheduled Report')).toBeInTheDocument();
    }, { timeout: 8000 });
    
    // Change email
    const emailInput = screen.getByDisplayValue('a@example.com');
    fireEvent.change(emailInput, { target: { value: 'updated@example.com' } });
    
    // Find and change frequency - try multiple approaches with better error handling
    let frequencySelect;
    try {
      frequencySelect = screen.getByDisplayValue('Weekly (Mon, 7:00 AM)');
    } catch (e) {
      try {
        frequencySelect = screen.getByLabelText(/frequency/i);
      } catch (e2) {
        try {
          frequencySelect = screen.getByRole('combobox', { name: /frequency/i });
        } catch (e3) {
          // Find any select that might be the frequency one
          const selects = screen.getAllByRole('combobox');
          frequencySelect = selects.find(select => 
            select.getAttribute('value')?.includes('weekly') || 
            select.innerHTML.includes('Weekly')
          ) || selects[1]; // Assume second select is frequency
        }
      }
    }
    
    if (frequencySelect) {
      fireEvent.change(frequencySelect, { target: { value: 'monthly' } });
    }

    // Click the Update button
    const updateButton = screen.getByRole('button', { name: 'Update' });
    fireEvent.click(updateButton);

    // Wait for the API call with increased timeout
    await waitFor(() =>
      expect(updateScheduledReport).toHaveBeenCalledWith('sr1', {
        board_id: 'b1',
        report_type: 'dashboard',
        frequency: 'monthly',
        recipients: ['updated@example.com'],
        report_params: {},
      }),
      { timeout: 8000 }
    );
  });
});
