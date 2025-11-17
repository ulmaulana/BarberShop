import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type QueryConstraint,
  type DocumentData,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore'
import { customerFirestore } from '../config/firebaseCustomer'
import type { EntityId } from '../types'

export class FirebaseService {
  private firestore: Firestore
  private collectionName: string
  
  constructor(
    collectionName: string,
    firestoreInstance?: Firestore
  ) {
    this.collectionName = collectionName
    this.firestore = firestoreInstance ?? customerFirestore
  }

  async getById(id: EntityId): Promise<DocumentData | null> {
    const docRef = doc(this.firestore, this.collectionName, id)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() }
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<DocumentData[]> {
    const collectionRef = collection(this.firestore, this.collectionName)
    const q = query(collectionRef, ...constraints)
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }

  async create(data: Partial<DocumentData>): Promise<EntityId> {
    const collectionRef = collection(this.firestore, this.collectionName)
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const docRef = await addDoc(collectionRef, docData)
    return docRef.id
  }

  async update(id: EntityId, data: Partial<DocumentData>): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  async delete(id: EntityId): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id)
    await deleteDoc(docRef)
  }

  async query(constraints: QueryConstraint[]): Promise<DocumentData[]> {
    return this.getAll(constraints)
  }

  buildQuery(filters: { field: string; operator: any; value: any }[]) {
    const constraints: QueryConstraint[] = filters.map((f) =>
      where(f.field, f.operator, f.value)
    )
    return constraints
  }

  static orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return orderBy(field, direction)
  }

  static limit(count: number) {
    return limit(count)
  }

  static where(field: string, operator: any, value: any) {
    return where(field, operator, value)
  }
}
