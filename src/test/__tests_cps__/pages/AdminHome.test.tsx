import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminHome from '../../../pages/Admin/AdminHome';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    __esModule: true,
    useNavigate: () => mockNavigate,
    MemoryRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }),
  { virtual: true }
);

jest.mock('react-chartjs-2', () => ({
  Chart: () => <div data-testid="chart" />,
  Doughnut: () => <div data-testid="doughnut" />,
}));

jest.mock('chart.js', () => ({
  Chart: { register: jest.fn() },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  PointElement: {},
  LineElement: {},
  ArcElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {},
}));

jest.mock('../../../api/userApi', () => ({ fetchAllUsers: jest.fn() }));
jest.mock('../../../api/boardApi', () => ({ fetchMyBoards: jest.fn(() => ({ data: { data: [] } })) }));
jest.mock('../../../api/taskApi', () => ({ fetchTasksByBoard: jest.fn(() => ({ data: [] })) }));
jest.mock('../../../api/groupApi', () => ({ getAllGroups: jest.fn(() => ({ data: [] })) }));
jest.mock('../../../api/deploymentApi', () => ({
  getDeploymentHistory: jest.fn(() => ({ data: [] })),
  getCurrentProductionDeployment: jest.fn(() => ({ data: {} })),
}));

jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

describe('AdminHome (test env short-circuit)', () => {
  const renderPage = () => render(<AdminHome />);

  it('renders test statistics and cards', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText(/Total Users \(New Accounts\)/i)).toBeInTheDocument());

    expect(screen.getByText(/Total Users \(New Accounts\)/i).parentElement?.parentElement).toHaveTextContent('3');
    expect(screen.getByText(/Pending Approvals/i).parentElement).toHaveTextContent('1');
    expect(screen.getByText(/Active Projects/i).parentElement?.parentElement).toHaveTextContent('2');
    expect(screen.getByText(/Completion Rate/i).parentElement?.parentElement).toHaveTextContent('40');
  });

  it('shows recent activity from test data', async () => {
    renderPage();

    expect(await screen.findByText(/Task 1 - Board 1/i)).toBeInTheDocument();
  });

  it('triggers navigation for quick admin actions', async () => {
    renderPage();

    await screen.findByText(/Manage Users/i);
    fireEvent.click(screen.getByRole('button', { name: /Manage Users/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/usermanagement');

    fireEvent.click(screen.getByRole('button', { name: /Project Overview/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/projects');
  });
});

describe('AdminHome (production data flow)', () => {
  const originalEnv = process.env.NODE_ENV;
  const setNodeEnv = (value?: string) => {
    (process.env as any).NODE_ENV = value;
  };

  const setupWithData = async () => {
    setNodeEnv('production');

    const { fetchAllUsers } = require('../../../api/userApi');
    const { fetchMyBoards } = require('../../../api/boardApi');
    const { fetchTasksByBoard } = require('../../../api/taskApi');
    const { getAllGroups } = require('../../../api/groupApi');

    fetchAllUsers.mockResolvedValue({ data: { users: [{ _id: 'u1' }, { _id: 'u2' }] } });
    fetchMyBoards.mockResolvedValue({ data: [{ _id: 'b1', title: 'Board 1' }] });
    fetchTasksByBoard.mockResolvedValue({
      data: [
        {
          _id: 't1',
          title: 'Task 1',
          status: 'Review',
          column: { name: 'Review' },
          updated_at: new Date().toISOString(),
          board_id: 'b1',
          created_by: { full_name: 'Admin One' },
        },
        {
          _id: 't2',
          title: 'Task 2',
          column: { name: 'Done', isDone: true },
          created_at: new Date().toISOString(),
          board_id: 'b1',
          created_by: { full_name: 'Admin Two' },
        },
      ],
    });
    getAllGroups.mockResolvedValue({ data: [{ id: 'g1' }] });

    const AdminHomeProd = require('../../../pages/Admin/AdminHome').default;
    render(<AdminHomeProd />);

    await waitFor(() => expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument());
  };

  afterEach(() => {
    setNodeEnv(originalEnv);
    jest.clearAllMocks();
  });

  it('loads live data, computes stats, and shows activities', async () => {
    await setupWithData();

    expect(screen.getByLabelText(/Pending Reviews Count/i)).toHaveTextContent('1');
    expect(screen.getByText(/Active Projects/i).closest('button')).toHaveTextContent('1');
    expect(screen.getByText(/\+\s*2(?!\d)/)).toBeInTheDocument();
    expect(screen.getByText(/Recent Admin Activities/i)).toBeInTheDocument();
    expect(screen.getByText(/Task 1 - Board 1/i)).toBeInTheDocument();
  });
});
