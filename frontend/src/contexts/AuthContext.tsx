import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseAuth, firestore } from '../config/firebase'
import type { AuthState, AuthUser, UserRole } from '../types/auth'
import { ROLE_PERMISSIONS } from '../types/auth'

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchUserRole(uid: string): Promise<UserRole> {
  const profileRef = doc(firestore, 'users', uid)
  const snapshot = await getDoc(profileRef)
  const role = snapshot.get('role') as UserRole | undefined
  return role ?? 'customer'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ loading: false, user: null })
        return
      }

      const role = await fetchUserRole(firebaseUser.uid)

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

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(firebaseAuth, email, password)
  }

  const register = async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    await updateProfile(credential.user, { displayName: name })
    await sendEmailVerification(credential.user)
    await setDoc(doc(firestore, 'users', credential.user.uid), {
      uid: credential.user.uid,
      email,
      name,
      role: 'customer',
      emailVerified: credential.user.emailVerified,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phone: '',
      noShowCount: 0,
    })
  }

  const logout = async () => {
    await signOut(firebaseAuth)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(firebaseAuth, email)
  }

  const hasPermission = (permission: string) => {
    if (!state.user) return false
    const allowed = ROLE_PERMISSIONS[state.user.role]
    return allowed.includes(permission as never)
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        resetPassword,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
