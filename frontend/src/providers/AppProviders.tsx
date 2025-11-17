import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { useState } from 'react'
import { appRouter } from '../router'
import { AuthProvider } from '../contexts/AuthContext'
import { ToastProvider } from '../contexts/ToastContext'
import { ErrorBoundary } from '../components/ErrorBoundary'

export function AppProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 60 * 1000,
          },
        },
      }),
  )

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider router={appRouter} />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
