// Unskipped: keep real behavior tests below
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import axios from 'axios';
import Login from '../../../pages/Login/Login';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
jest.mock('axios');
jest.mock('../../../socket', () => ({ socket: { emit: jest.fn() } }));
jest.mock('../../../auth/useKeycloak', () => ({ useAuth: () => ({ login: jest.fn() }) }));
jest.mock('../../../api/logoApi', () => ({ getUlrLogo: jest.fn().mockResolvedValue({ success: true, data: [{ url: 'logo.png' }] }) }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  MemoryRouter: ({ children }: any) => <div>{children}</div>
}), { virtual: true });
process.env.REACT_APP_SOCKET_URL = 'http://localhost:3005/api';

describe('Login page behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => jest.useRealTimers());

  it('prefills remembered email and checkbox state on mount', () => {
    localStorage.setItem('remember_email', 'saved@cg.com');
    render(<Login />);
    const emailInput = screen.getByPlaceholderText(/username or email/i) as HTMLInputElement;
    expect(emailInput.value).toBe('saved@cg.com');
    const rememberCheckbox = screen.getByRole('checkbox', { name: /remember account/i });
    expect((rememberCheckbox as HTMLInputElement).checked).toBe(true);
  });

  it('should remember email when remember checkbox is checked', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { success: true, data: { token: 't', refreshToken: 'rt', user: { id: '1', email: 'test@cg.com', role: 'user', roles: ['user'] } } }
    });
    
    render(<Login />);
    const emailInput = screen.getByPlaceholderText(/username or email/i);
    const rememberCheckbox = screen.getByLabelText(/remember account/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /^login$/i });
    
    await userEvent.type(emailInput, 'test@cg.com');
    await userEvent.type(passwordInput, 'password');
    await userEvent.click(rememberCheckbox);
    await userEvent.click(loginButton);
    
    await waitFor(() => {
      expect(localStorage.getItem('remember_email')).toBe('test@cg.com');
    });
  });

  it('logs in admin user -> splash then navigate /admin', async () => {
    jest.useFakeTimers();
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { success: true, data: { token: 't', refreshToken: 'rt', user: { id: '1', email: 'admin@cg.com', role: 'admin', roles: [] } } }
    });
    render(<Login />);
    await userEvent.type(screen.getByPlaceholderText(/username or email/i), 'admin@cg.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'pwd');
    await userEvent.click(screen.getByRole('checkbox', { name: /remember account/i }));
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    jest.advanceTimersByTime(2500);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true }));
  });

  it('logs in normal user -> navigate /dashboard', async () => {
    jest.useFakeTimers();
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { success: true, data: { token: 't', refreshToken: 'rt', user: { id: '2', email: 'user@cg.com', roles: ['user'] } } }
    });
    render(<Login />);
    await userEvent.type(screen.getByPlaceholderText(/username or email/i), 'user@cg.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    jest.advanceTimersByTime(2500);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }));
  });

  it('shows error toast on failed login', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({ data: { success: false, message: 'Invalid' } });
    render(<Login />);
    await userEvent.type(screen.getByPlaceholderText(/username or email/i), 'bad@cg.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables login button while processing', async () => {
    jest.useFakeTimers();
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { success: true, data: { token: 't', refreshToken: 'rt', user: { id: '3', email: 'slow@cg.com', roles: ['user'] } } }
    });
    render(<Login />);
    await userEvent.type(screen.getByPlaceholderText(/username or email/i), 'slow@cg.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'pw');
    const btn = screen.getByRole('button', { name: /^login$/i });
    await userEvent.click(btn);
    expect(btn).toBeDisabled();
    jest.advanceTimersByTime(2500);
  });

  // SSO login button removed from UI: login page should only support local login.
});
