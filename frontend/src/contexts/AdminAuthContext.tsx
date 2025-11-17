import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { adminAuth, adminFirestore } from '../config/firebaseAdmin'
import type { AuthState, AuthUser, UserRole } from '../types/auth'

interface AdminAuthContextValue extends AuthState {
  logout: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined)

async function fetchUserRole(uid: string): Promise<UserRole> {
  const profileRef = doc(adminFirestore, 'users', uid)
  const snapshot = await getDoc(profileRef)
  const role = snapshot.get('role') as UserRole | undefined
  return role ?? 'customer'
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(adminAuth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setState({ loading: false, user: null })
        return
      }

      const role = await fetchUserRole(firebaseUser.uid)

      // Only allow admin users
      if (role !== 'admin') {
        await signOut(adminAuth)
        setState({ loading: false, user: null })
        return
      }

      const authUser: AuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: firebaseUser.displayName ?? undefined,
        photoURL: firebaseUser.photoURL ?? undefined,
        emailVerified: firebaseUser.emailVerified,
        role,
      }

      setState({ loading: false, user: authUser })
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    await signOut(adminAuth)
  }

  return (
    <AdminAuthContext.Provider
      value={{
        ...state,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return context
}
