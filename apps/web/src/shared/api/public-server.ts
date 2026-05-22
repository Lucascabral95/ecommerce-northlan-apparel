import 'server-only';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? 'http://localhost:4000/api/v1';

export async function publicServerRequest<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Public Gateway request failed with status ${response.status}.`);
  }

  return (await response.json()) as TResponse;
}
