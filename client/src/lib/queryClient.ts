import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 404s or network errors
        if (error instanceof Error && (error.message.includes('404') || error.message.includes('Failed to fetch'))) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      queryFn: async ({ queryKey, signal }) => {
        try {
          const [url, ...params] = queryKey as [string, ...unknown[]];

          if (!url) {
            throw new Error('Query key must include a URL');
          }

          let fullUrl = url;
          if (params.length > 0 && params[0]) {
            const lastParam = params[params.length - 1];
            if (typeof lastParam === 'string' || typeof lastParam === 'number') {
              fullUrl = `${url}/${lastParam}`;
            }
          }

          const response = await fetch(fullUrl, {
            signal,
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Response is not JSON');
          }

          const data = await response.json();
          return data;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error;
          }
          console.warn('Query failed:', error);
          throw error;
        }
      },
    },
    mutations: {
      retry: false,
      onError: (error) => {
        console.warn('Mutation error:', error);
      },
    },
  },
});