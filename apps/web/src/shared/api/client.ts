import type { AuthResponseDto } from '@northlane/contracts';
import { useAuthStore } from '../../features/auth/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000/api/v1';
const SESSION_EXPIRED_MESSAGE = 'Session expired. Sign in again.';

type ApiErrorBody = Readonly<{
  error?: {
    message?: string;
  };
  statusCode?: number;
}>;

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
};

let refreshRequest: Promise<AuthResponseDto> | undefined;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<TResponse>(
  path: string,
  init: ApiRequestOptions = {},
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) {
    headers.set('content-type', 'application/json');
  }

  if (init.auth) {
    const token = useAuthStore.getState().tokens?.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, buildRequestInit(init, headers));

  if (shouldRetryWithRefresh(path, init, response.status)) {
    await refreshAuthSession();
    return apiRequest(path, {
      ...init,
      retryOnUnauthorized: false,
    });
  }

  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new ApiError(
      body.error?.message ?? 'The request could not be completed.',
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

function readErrorBody(response: Response): Promise<ApiErrorBody> {
  return response.json().catch(() => ({}) as ApiErrorBody);
}

function buildRequestInit(init: ApiRequestOptions, headers: Headers): RequestInit {
  const { auth: _auth, retryOnUnauthorized: _retryOnUnauthorized, ...requestInit } = init;
  return {
    ...requestInit,
    headers,
  };
}

function shouldRetryWithRefresh(path: string, init: ApiRequestOptions, status: number): boolean {
  return Boolean(init.auth) && init.retryOnUnauthorized !== false && status === 401 && path !== '/auth/refresh';
}

async function refreshAuthSession(): Promise<void> {
  if (!refreshRequest) {
    refreshRequest = executeRefreshRequest();
  }

  try {
    const response = await refreshRequest;
    useAuthStore.getState().setSession(response);
  } finally {
    refreshRequest = undefined;
  }
}

async function executeRefreshRequest(): Promise<AuthResponseDto> {
  const refreshToken = useAuthStore.getState().tokens?.refreshToken;
  if (!refreshToken) {
    useAuthStore.getState().clearSession();
    throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    body: JSON.stringify({ refreshToken }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    useAuthStore.getState().clearSession();
    throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
  }

  return (await response.json()) as AuthResponseDto;
}
