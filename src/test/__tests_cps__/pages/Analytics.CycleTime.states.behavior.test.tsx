import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CycleTime from '../../../pages/Analytics/CycleTime';
jest.mock('react-router-dom', () => ({
  Navigate: ({ children }: any) => <div>{children}</div>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/analytics/cycle-time' }),
  useSearchParams: () => [new URLSearchParams(''), jest.fn()],
}), { virtual: true });

jest.mock('../../../api/analyticsApi', () => ({
  getCycleTime: jest.fn(async () => ({ data: [] })),
}));

describe('Analytics CycleTime behavior: basic render', () => {
  // Set timeout for all tests in this describe block
  jest.setTimeout(10000);
  
  test('renders heading text and empty-state copy', async () => {
    render(<CycleTime />);
    
    // Wait for component to load and render content
    await waitFor(() => {
      // Look for the specific h1 heading with "Cycle Time Analysis"
      expect(screen.getByRole('heading', { name: /Cycle Time Analysis/i })).toBeInTheDocument();
      
      // Also check for the description text
      expect(screen.getByText(/Analyze cycle time from task creation to completion/i)).toBeInTheDocument();
      
      // Check for the empty state message
      expect(screen.getByText(/No data available. Please select a board with completed tasks./i)).toBeInTheDocument();
    }, { timeout: 8000 });
  });
});
