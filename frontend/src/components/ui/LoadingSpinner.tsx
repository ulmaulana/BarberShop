interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-300 border-t-blue-600`} />
    </div>
  )
}

export function LoadingPage() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Memuat...</p>
      </div>
    </div>
  )
}
