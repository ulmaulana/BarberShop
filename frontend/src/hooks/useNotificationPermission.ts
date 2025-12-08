import { useState, useEffect, useCallback } from 'react'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  saveFCMTokenToUser,
  onForegroundMessage,
  showLocalNotification,
  refreshFCMToken
} from '../utils/notifications'
import { useAuth } from '../contexts/AuthContext'
import type { MessagePayload } from 'firebase/messaging'

interface UseNotificationPermissionReturn {
  isSupported: boolean
  permission: NotificationPermission | 'unsupported'
  isLoading: boolean
  fcmToken: string | null
  requestPermission: () => Promise<boolean>
  refreshToken: () => Promise<boolean>
  hasAskedBefore: boolean
  dismissPrompt: () => void
  shouldShowPrompt: boolean
}

const NOTIFICATION_PROMPT_KEY = 'sahala_notification_asked'

export function useNotificationPermission(): UseNotificationPermissionReturn {
  const { user } = useAuth()
  const [isSupported] = useState(() => isNotificationSupported())
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => 
    getNotificationPermission()
  )
  const [isLoading, setIsLoading] = useState(false)
  const [fcmToken, setFcmToken] = useState<string | null>(null)
  const [hasAskedBefore, setHasAskedBefore] = useState(() => {
    return localStorage.getItem(NOTIFICATION_PROMPT_KEY) === 'true'
  })

  // Determine if we should show the prompt
  const shouldShowPrompt = isSupported && 
    permission === 'default' && 
    !hasAskedBefore

  // Listen for foreground messages
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return

    const unsubscribe = onForegroundMessage((payload: MessagePayload) => {
      // Show notification when app is in foreground
      const title = payload.notification?.title || 'Sahala Barber'
      const body = payload.notification?.body || 'Ada notifikasi baru'
      
      showLocalNotification(title, {
        body,
        tag: 'foreground-notification',
        data: payload.data
      })
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [isSupported, permission])

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    setIsLoading(true)
    try {
      const result = await requestNotificationPermission()
      
      // Update permission state
      setPermission(Notification.permission)
      
      // Mark as asked
      localStorage.setItem(NOTIFICATION_PROMPT_KEY, 'true')
      setHasAskedBefore(true)

      if (result.success && result.token) {
        setFcmToken(result.token)
        
        // Save token to user if logged in
        if (user?.uid) {
          await saveFCMTokenToUser(user.uid, result.token)
        }
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error requesting permission:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, user?.uid])

  // Dismiss prompt without requesting
  const dismissPrompt = useCallback(() => {
    localStorage.setItem(NOTIFICATION_PROMPT_KEY, 'true')
    setHasAskedBefore(true)
  }, [])

  // Auto-refresh token on mount if permission already granted
  useEffect(() => {
    if (!isSupported || permission !== 'granted' || !user?.uid) return

    // Auto refresh token untuk memastikan token cocok dengan SW aktif
    const autoRefresh = async () => {
      console.log('Auto-refreshing FCM token...')
      const result = await refreshFCMToken()
      if (result.success && result.token) {
        console.log('Token refreshed successfully')
        setFcmToken(result.token)
        await saveFCMTokenToUser(user.uid, result.token)
      } else {
        console.error('Failed to refresh token:', result.error)
      }
    }

    autoRefresh()
  }, [isSupported, permission, user?.uid])

  // Refresh token manually
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') return false

    setIsLoading(true)
    try {
      const result = await refreshFCMToken()
      if (result.success && result.token) {
        setFcmToken(result.token)
        if (user?.uid) {
          await saveFCMTokenToUser(user.uid, result.token)
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error refreshing token:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, permission, user?.uid])

  // Re-save token when user logs in
  useEffect(() => {
    if (user?.uid && fcmToken) {
      saveFCMTokenToUser(user.uid, fcmToken)
    }
  }, [user?.uid, fcmToken])

  return {
    isSupported,
    permission,
    isLoading,
    fcmToken,
    requestPermission,
    refreshToken,
    hasAskedBefore,
    dismissPrompt,
    shouldShowPrompt
  }
}
