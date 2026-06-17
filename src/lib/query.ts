import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Personal app, small data: refetch is cheap, but avoid hammering on focus.
      staleTime: 30_000,
      retry: 1,
    },
  },
});
