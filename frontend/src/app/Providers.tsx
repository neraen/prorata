import { useEffect } from 'react'
import { useAuthStore } from '../lib/stores'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toast } from '../components/ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => useAuthStore.subscribe((state, previous) => {
    if (state.user?.id !== previous.user?.id) queryClient.clear()
  }), [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
        <Toast />
      </BrowserRouter>
    </QueryClientProvider>
  )
}