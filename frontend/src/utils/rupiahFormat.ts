/**
 * Format number ke format Rupiah dengan titik pemisah ribuan
 * @param value - Number atau string yang akan di-format
 * @returns String dalam format Rupiah (e.g., "50.000")
 */
export function formatRupiah(value: number | string): string {
  // Convert to number if string
  const numValue = typeof value === 'string' ? parseInt(value.replace(/\./g, ''), 10) : value
  
  // Return empty if NaN or 0
  if (isNaN(numValue) || numValue === 0) return ''
  
  // Format dengan titik pemisah ribuan
  return numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Parse string Rupiah ke number
 * @param value - String Rupiah (e.g., "50.000" atau "50000")
 * @returns Number tanpa format
 */
export function parseRupiah(value: string): number {
  // Hapus semua titik
  const cleanValue = value.replace(/\./g, '')
  
  // Parse ke number
  const numValue = parseInt(cleanValue, 10)
  
  // Return 0 if NaN
  return isNaN(numValue) ? 0 : numValue
}

/**
 * Handle onChange event untuk input Rupiah
 * @param e - React ChangeEvent
 * @param setter - State setter function
 */
export function handleRupiahChange(
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (value: number) => void
) {
  const inputValue = e.target.value
  
  // Allow only numbers and dots
  const cleanValue = inputValue.replace(/[^\d.]/g, '')
  
  // Parse to number (remove dots)
  const numValue = parseRupiah(cleanValue)
  
  // Update state with number
  setter(numValue)
}
