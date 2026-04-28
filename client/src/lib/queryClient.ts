import { QueryClient, QueryCache, MutationCache, QueryFunction } from "@tanstack/react-query";

const LOGIN_PATH_PREFIXES = ["/login", "/guest/login", "/api/login"];

let redirectingTo401 = false;

function isOnLoginPage(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return LOGIN_PATH_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export function handleUnauthorized(): boolean {
  if (redirectingTo401) return true;
  if (isOnLoginPage()) return false;
  redirectingTo401 = true;
  window.location.href = "/api/login";
  return true;
}

function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.startsWith("401:");
}

// Returned when a 401 is detected and a redirect is in progress. The promise
// never settles so callers (mutations, queries, raw fetch wrappers) do not
// surface error/success handlers — the page is navigating away anyway.
function neverSettlingPromise<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401 && handleUnauthorized()) {
      // Suppress error propagation so per-page error handlers don't
      // surface a raw "401: Unauthorized" toast before navigation.
      // Only suppress when a redirect was actually triggered — otherwise
      // (e.g. the user is already on a login page) let the error settle
      // normally so callers can react.
      await neverSettlingPromise<never>();
    }
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
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      if (handleUnauthorized()) {
        // Suppress error propagation while navigating away. If no redirect
        // was triggered (already on a login page), fall through and throw
        // normally so callers can settle the query.
        return neverSettlingPromise();
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export function invalidateDealQueries(dealId: string | undefined) {
  if (!dealId) return;
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId] }),
    queryClient.invalidateQueries({ queryKey: ["/api/deals"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/data-rooms"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/background-research"] }),
  ]);
}

export const DEAL_DETAIL_STALE_TIME = 30_000;

export const queryClient = new QueryClient({
  // Catch 401s that originate from custom queryFn / mutationFn implementations
  // that do not go through `apiRequest` (e.g. raw `fetch` calls that throw an
  // error whose message starts with "401:").
  queryCache: new QueryCache({
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        handleUnauthorized();
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        handleUnauthorized();
      }
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
