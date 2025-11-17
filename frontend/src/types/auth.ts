export const USER_ROLES = ['customer', 'barber', 'cashier', 'owner', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const ROLE_HIERARCHY: UserRole[] = [...USER_ROLES]

export type Permission =
  | 'appointments.read'
  | 'appointments.manage'
  | 'queue.read'
  | 'queue.manage'
  | 'products.manage'
  | 'orders.manage'
  | 'transactions.view'
  | 'analytics.view'
  | 'users.manage'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  customer: ['appointments.read', 'queue.read'],
  barber: ['appointments.read', 'appointments.manage', 'queue.manage'],
  cashier: [
    'appointments.read',
    'queue.read',
    'products.manage',
    'orders.manage',
    'transactions.view',
  ],
  owner: [
    'appointments.read',
    'appointments.manage',
    'queue.manage',
    'products.manage',
    'orders.manage',
    'transactions.view',
    'analytics.view',
  ],
  admin: [
    'appointments.read',
    'appointments.manage',
    'queue.manage',
    'products.manage',
    'orders.manage',
    'transactions.view',
    'analytics.view',
    'users.manage',
  ],
}

export interface AuthUser {
  uid: string
  email: string
  displayName?: string
  role: UserRole
  emailVerified: boolean
  photoURL?: string
}

export interface AuthState {
  loading: boolean
  user: AuthUser | null
}
