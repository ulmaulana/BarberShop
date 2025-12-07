export type EntityId = string

export interface BaseEntity {
  id: EntityId
  createdAt: string
  updatedAt: string
}

export interface UserProfile extends BaseEntity {
  uid: string
  email: string
  name: string
  phone: string
  role: string
  preferredBarberId?: EntityId
  photoURL?: string
  emailVerified: boolean
  noShowCount: number
}

export interface Barber extends BaseEntity {
  userId: string
  name: string
  avatarUrl?: string
  specializations: string[]
  workingDays: number[]
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
  averageServiceDuration: number
  rating: number
  totalReviews: number
  status: 'available' | 'busy' | 'on_break'
}

export interface Service extends BaseEntity {
  name: string
  description: string
  durationMinutes: number
  price: number
  barberIds: EntityId[]
  category: 'styling' | 'cut' | 'color' | 'treatment'
  isActive?: boolean
}

export interface Appointment extends BaseEntity {
  customerId: EntityId
  barberId: EntityId
  serviceId: EntityId
  startTime: string
  endTime: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  cancellationReason?: string
  verificationToken?: string
}

export interface QueueEntry extends BaseEntity {
  customerId: EntityId
  barberId?: EntityId
  position: number
  status: 'waiting' | 'called' | 'served' | 'left'
  estimatedWaitMinutes: number
  joinedAt: string
}

export interface Product extends BaseEntity {
  name: string
  description: string
  category: 'styling' | 'vitamins' | 'color'
  price: number
  stock: number
  images: string[]
  lowStockThreshold: number
  isActive?: boolean
}

export interface OrderItem {
  productId: EntityId
  name: string
  price: number
  quantity: number
}

export interface Order extends BaseEntity {
  customerId: EntityId
  items: OrderItem[]
  total: number
  paymentMethod: 'qris' | 'cash'
  status: 'pending_payment' | 'pending_verification' | 'processing' | 'ready_for_pickup' | 'completed' | 'payment_rejected'
  paymentProofUrl?: string
  verificationNote?: string
  verifiedBy?: EntityId
}

export interface Transaction extends BaseEntity {
  referenceId: EntityId
  type: 'service' | 'product'
  amount: number
  method: 'qris' | 'cash'
  cashierId: EntityId
}

export interface Review extends BaseEntity {
  appointmentId: EntityId
  customerId: EntityId
  barberId: EntityId
  rating: number
  comment?: string
}

export interface Notification extends BaseEntity {
  userId: EntityId
  title: string
  body: string
  read: boolean
  type:
    | 'appointment'
    | 'queue'
    | 'order'
    | 'payment'
    | 'rating'
    | 'system'
  data?: Record<string, unknown>
}
