import React from 'react';
import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/analytics/centers' }),
  useSearchParams: () => [new URLSearchParams('?center=all'), jest.fn()],
}), { virtual: true });
jest.mock('../../../api/analyticsApi', () => ({
  compareCentersPerformance: jest.fn(),
}));
jest.mock('../../../api/boardApi', () => ({
  fetchMyBoards: jest.fn(),
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));

describe('pages/Analytics/CentersPerformance', () => {
  it('renders without crashing', () => {
    const Comp = require('../../../pages/Analytics/CentersPerformance').default;
    const { container } = render(<Comp />);
    expect(container).toBeTruthy();
  });

  it('shows empty state when no data available', async () => {
    const boards = require('../../../api/boardApi');
    const analytics = require('../../../api/analyticsApi');
    boards.fetchMyBoards.mockResolvedValueOnce({ data: [{ _id: 'b1', title: 'Board 1' }] });
    analytics.compareCentersPerformance.mockResolvedValueOnce({ success: false });
    const Comp = require('../../../pages/Analytics/CentersPerformance').default;
    render(<Comp />);
    expect(await screen.findByText(/No data available/i)).toBeInTheDocument();
  });

  it('renders header and summary when data loads', async () => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    const sample = {
      success: true,
      data: {
        summary: { totalCenters: 1, totalUsers: 10, totalActiveUsers: 5, totalTasks: 20, totalCompletedTasks: 12, overallCompletionRate: 60 },
        centers: [
          {
            center_id: 'c1', center_name: 'Center A', center_status: 'active', totalUsers: 10, activeUsers: 5,
            totalTasks: 20, completedTasks: 12, inProgressTasks: 8, completionRate: 60, averageCompletionRatePerUser: 6,
            totalPoints: 1000, averagePointsPerUser: 100, activeDays: 50, averageActiveDaysPerUser: 5
          }
        ],
        rankings: {
          byCompletionRate: [{ rank: 1, center_id: 'c1', center_name: 'Center A', value: 60 }],
          byTotalTasks: [{ rank: 1, center_id: 'c1', center_name: 'Center A', value: 20 }],
          byActiveUsers: [{ rank: 1, center_id: 'c1', center_name: 'Center A', value: 5 }],
          byAveragePoints: [{ rank: 1, center_id: 'c1', center_name: 'Center A', value: 100 }],
          byEngagement: [{ rank: 1, center_id: 'c1', center_name: 'Center A', value: 5 }]
        },
        insights: { topPerformer: { rank:1, center_id:'c1', center_name:'Center A', value:60 }, mostActive: null, mostEngaged: null, needsSupport: null }
      }
    };
    const boards = require('../../../api/boardApi');
    const analytics = require('../../../api/analyticsApi');
    boards.fetchMyBoards.mockResolvedValueOnce({ data: [{ _id: 'b1', title: 'Board 1' }] });
    analytics.compareCentersPerformance.mockResolvedValueOnce(sample);
    const Comp = require('../../../pages/Analytics/CentersPerformance').default;
    render(<Comp />);
    expect(await screen.findByText(/Centers Performance Comparison/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Centers/i)).toBeInTheDocument();
    const centers = screen.getAllByText(/Center A/i);
    expect(centers.length).toBeGreaterThan(0);
  });

  it('error path shows empty state', async () => {
    const boards = require('../../../api/boardApi');
    const analytics = require('../../../api/analyticsApi');
    boards.fetchMyBoards.mockResolvedValueOnce({ data: [{ _id: 'b1', title: 'Board 1' }] });
    analytics.compareCentersPerformance.mockRejectedValueOnce(new Error('network'));
    const Comp = require('../../../pages/Analytics/CentersPerformance').default;
    render(<Comp />);
    expect(await screen.findByText(/No data available/i)).toBeInTheDocument();
  });
});
