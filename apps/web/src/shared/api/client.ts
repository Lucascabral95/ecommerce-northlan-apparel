import { useAuthStore } from '../../features/auth/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:4000/api/v1';

type ApiErrorBody = Readonly<{
  error?: {
    message?: string;
  };
  statusCode?: number;
}>;

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
  init: RequestInit & { auth?: boolean } = {},
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

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
