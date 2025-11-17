import { useState, useEffect } from 'react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { firestore } from '../../../config/firebase'
import { useToast } from '../../../contexts/ToastContext'
import { CloudinaryImageUpload } from '../../../components/common/CloudinaryImageUpload'

interface WorkingHours {
  [key: string]: { start: string; end: string; isOpen: boolean }
}

interface Barber {
  id: string
  name: string
  phone: string
  specialization: string
  imageUrl?: string
  workingHours: WorkingHours
  isActive: boolean
}

interface Props {
  barber: Barber | null
  onClose: () => void
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: { [key: string]: string } = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { start: '09:00', end: '17:00', isOpen: true },
  tuesday: { start: '09:00', end: '17:00', isOpen: true },
  wednesday: { start: '09:00', end: '17:00', isOpen: true },
  thursday: { start: '09:00', end: '17:00', isOpen: true },
  friday: { start: '09:00', end: '17:00', isOpen: true },
  saturday: { start: '09:00', end: '17:00', isOpen: true },
  sunday: { start: '09:00', end: '17:00', isOpen: false },
}

export function BarberFormModal({ barber, onClose }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    specialization: '',
    imageUrl: '',
    isActive: true,
  })
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  
  useEffect(() => {
    if (barber) {
      setFormData({
        name: barber.name,
        phone: barber.phone,
        specialization: barber.specialization,
        imageUrl: barber.imageUrl || '',
        isActive: barber.isActive,
      })
      setWorkingHours(barber.workingHours || DEFAULT_WORKING_HOURS)
    }
  }, [barber])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      showToast('Barber name is required', 'error')
      return
    }
    
    if (!formData.phone.trim()) {
      showToast('Phone number is required', 'error')
      return
    }
    
    if (!formData.specialization.trim()) {
      showToast('Specialization is required', 'error')
      return
    }
    
    // Validate at least one working day
    const hasWorkingDay = Object.values(workingHours).some(day => day.isOpen)
    if (!hasWorkingDay) {
      showToast('Barber must have at least one working day', 'error')
      return
    }
    
    try {
      setLoading(true)
      
      const barberData = {
        ...formData,
        workingHours,
        updatedAt: serverTimestamp(),
      }
      
      if (barber) {
        // Update existing barber
        await updateDoc(doc(firestore, 'barbers', barber.id), barberData)
        showToast('Barber updated successfully', 'success')
      } else {
        // Create new barber
        await addDoc(collection(firestore, 'barbers'), {
          ...barberData,
          rating: 0,
          totalAppointments: 0,
          createdAt: serverTimestamp(),
        })
        showToast('Barber created successfully', 'success')
      }
      
      onClose()
    } catch (error) {
      console.error('Failed to save barber:', error)
      showToast('Failed to save barber', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleImageChange = (urls: string[]) => {
    setFormData(prev => ({ ...prev, imageUrl: urls[0] || '' }))
  }
  
  const handleWorkingHourChange = (day: string, field: 'start' | 'end' | 'isOpen', value: string | boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
  }
  
  const copyWorkingHours = (fromDay: string) => {
    const hours = workingHours[fromDay]
    const newWorkingHours = { ...workingHours }
    
    DAYS.forEach(day => {
      if (day !== fromDay) {
        newWorkingHours[day] = { ...hours }
      }
    })
    
    setWorkingHours(newWorkingHours)
    showToast('Working hours copied to all days', 'success')
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {barber ? 'Edit Barber' : 'Add New Barber'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barber Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. John Doe"
                maxLength={100}
              />
            </div>
            
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. 08123456789"
                maxLength={15}
              />
            </div>
          </div>
          
          {/* Specialization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialization <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Classic Haircut, Modern Style, Beard Trim"
              maxLength={200}
            />
          </div>
          
          {/* Barber Photo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barber Photo <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <CloudinaryImageUpload
              maxFiles={1}
              currentImages={formData.imageUrl ? [formData.imageUrl] : []}
              onUploadComplete={handleImageChange}
              folder="sahala_barber/barbers"
            />
          </div>
          
          {/* Working Hours */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Working Hours <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-500">
                At least 1 working day required
              </span>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              {DAYS.map((day, index) => (
                <div
                  key={day}
                  className={`flex items-center gap-4 p-4 ${
                    index !== DAYS.length - 1 ? 'border-b' : ''
                  } ${workingHours[day].isOpen ? 'bg-white' : 'bg-gray-50'}`}
                >
                  {/* Day Checkbox */}
                  <div className="w-32">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workingHours[day].isOpen}
                        onChange={(e) => handleWorkingHourChange(day, 'isOpen', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="font-medium text-gray-700">
                        {DAY_LABELS[day]}
                      </span>
                    </label>
                  </div>
                  
                  {/* Time Inputs */}
                  {workingHours[day].isOpen && (
                    <>
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={workingHours[day].start}
                          onChange={(e) => handleWorkingHourChange(day, 'start', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={workingHours[day].end}
                          onChange={(e) => handleWorkingHourChange(day, 'end', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => copyWorkingHours(day)}
                        className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                        title="Copy to all days"
                      >
                        Copy ↓
                      </button>
                    </>
                  )}
                  
                  {!workingHours[day].isOpen && (
                    <span className="text-sm text-gray-400 italic">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active (available for appointments)
            </label>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : barber ? 'Update Barber' : 'Create Barber'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
