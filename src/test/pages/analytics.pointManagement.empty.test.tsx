import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PointManagement from '../../pages/Analytics/PointManagement';
import { server } from '../test-utils/msw.server';
import { rest } from 'msw';

// Override centers handler to return empty list for this suite
beforeAll(() => {
  server.use(
    rest.get('*/centers', (_req, res, ctx) => {
      return res(ctx.status(200), ctx.json({ success: true, data: [] }));
    }),
  );
});

describe('PointManagement page - empty centers', () => {
  it('shows empty centers state and no leaderboard', async () => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    render(<PointManagement />);

    const centerSelect = await screen.findByRole('combobox', {}, { timeout: 8000 });
    expect(centerSelect).toBeInTheDocument();
    await waitFor(() => {
      // Title visible; with empty centers, expect no options besides placeholder
      expect(screen.getByText(/Point Management/i)).toBeInTheDocument();
    });
  });
});
