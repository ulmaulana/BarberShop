import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { customerAuth, customerFirestore } from '../config/firebaseCustomer'
import type { AuthState, AuthUser, UserRole } from '../types/auth'
import { ROLE_PERMISSIONS } from '../types/auth'

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (data: { displayName?: string; email?: string; phone?: string }) => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchUserRole(uid: string): Promise<UserRole> {
  const profileRef = doc(customerFirestore, 'users', uid)
  const snapshot = await getDoc(profileRef)
  const role = snapshot.get('role') as UserRole | undefined
  return role ?? 'customer'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, user: null })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(customerAuth, async (firebaseUser) => {
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
    await signInWithEmailAndPassword(customerAuth, email, password)
  }

  const register = async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(customerAuth, email, password)
    await updateProfile(credential.user, { displayName: name })
    await sendEmailVerification(credential.user)
    await setDoc(doc(customerFirestore, 'users', credential.user.uid), {
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
    await signOut(customerAuth)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(customerAuth, email)
  }

  const updateUserProfile = async (data: { displayName?: string; email?: string; phone?: string }) => {
    const currentUser = customerAuth.currentUser
    if (!currentUser) throw new Error('No user logged in')

    const updates: any = {
      updatedAt: new Date().toISOString(),
    }

    // Update displayName in Firebase Auth
    if (data.displayName && data.displayName !== currentUser.displayName) {
      await updateProfile(currentUser, { displayName: data.displayName })
      updates.name = data.displayName
    }

    // Update email in Firebase Auth (requires recent login)
    if (data.email && data.email !== currentUser.email) {
      await updateEmail(currentUser, data.email)
      await sendEmailVerification(currentUser)
      updates.email = data.email
      updates.emailVerified = false // Email needs to be verified again
    }

    // Update phone
    if (data.phone !== undefined) {
      updates.phone = data.phone
    }

    // Update Firestore document
    await updateDoc(doc(customerFirestore, 'users', currentUser.uid), updates)

    // Reload user to get updated data
    await currentUser.reload()
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
        updateUserProfile,
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
