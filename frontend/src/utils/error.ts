import { FirebaseError } from 'firebase/app'

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Email atau password salah'
      case 'auth/email-already-in-use':
        return 'Email sudah terdaftar'
      case 'auth/weak-password':
        return 'Password terlalu lemah'
      case 'auth/invalid-email':
        return 'Format email tidak valid'
      case 'auth/too-many-requests':
        return 'Terlalu banyak percobaan, coba lagi nanti'
      case 'permission-denied':
        return 'Anda tidak memiliki izin untuk aksi ini'
      case 'not-found':
        return 'Data tidak ditemukan'
      case 'already-exists':
        return 'Data sudah ada'
      default:
        return error.message || 'Terjadi kesalahan'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Terjadi kesalahan tidak diketahui'
}

export function handleError(error: unknown, fallbackMessage = 'Terjadi kesalahan'): string {
  console.error('Error:', error)
  return getErrorMessage(error) || fallbackMessage
}
