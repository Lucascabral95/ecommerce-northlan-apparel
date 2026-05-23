import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthResponseDto } from '@northlane/contracts';
import { useAuthStore } from '../../features/auth/auth-store';
import { ApiError, apiRequest } from './client';

const sessionResponse: AuthResponseDto = {
  tokens: {
    accessToken: 'access-token-next',
    expiresInSeconds: 900,
    refreshToken: 'refresh-token-next',
    tokenType: 'Bearer',
  },
  user: {
    email: 'user@northlane.test',
    role: 'USER',
    userId: 'user-1',
  },
};

describe('apiRequest', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    useAuthStore.getState().setSession({
      tokens: {
        accessToken: 'access-token-current',
        expiresInSeconds: 900,
        refreshToken: 'refresh-token-current',
        tokenType: 'Bearer',
      },
      user: sessionResponse.user,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clearSession();
  });

  it('refreshes the session and retries the original authenticated request once', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'Token expired.' },
            statusCode: 401,
          }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(sessionResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'address-1' }), { status: 200 }));

    vi.stubGlobal('fetch', fetchMock);

    const response = await apiRequest<{ id: string }>('/me/addresses', {
      auth: true,
    });

    expect(response).toEqual({ id: 'address-1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:4000/api/v1/auth/refresh');
    expect(useAuthStore.getState().tokens?.accessToken).toBe('access-token-next');
    expect(useAuthStore.getState().tokens?.refreshToken).toBe('refresh-token-next');
  });

  it('clears the session when the refresh token is rejected', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'Token expired.' },
            statusCode: 401,
          }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: 'Invalid refresh token.' },
            statusCode: 401,
          }),
          { status: 401 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiRequest('/me', {
        auth: true,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        message: 'Session expired. Sign in again.',
        status: 401,
      } satisfies Partial<ApiError>),
    );

    expect(useAuthStore.getState().tokens).toBeUndefined();
    expect(useAuthStore.getState().user).toBeUndefined();
  });
});
