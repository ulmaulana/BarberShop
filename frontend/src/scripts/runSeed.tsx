import { seedPayments } from './seedPayments'

/**
 * Component sementara untuk run seed script
 * 
 * Cara pakai:
 * 1. Import component ini di App.tsx atau router.tsx
 * 2. Render <SeedRunner /> di halaman manapun
 * 3. Klik tombol "Seed Payments"
 * 4. Check console & Firebase
 * 5. Hapus component ini setelah selesai
 */

export function SeedRunner() {
  const handleSeed = async () => {
    const confirm = window.confirm('Seed dummy payments ke Firebase?\n\nIni akan menambahkan 5 order dummy.')
    
    if (confirm) {
      console.log('⏳ Processing...')
      await seedPayments()
      alert('✅ Seeding selesai! Check console & Firebase.')
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleSeed}
        className="px-6 py-3 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition font-medium"
      >
        🌱 Seed Payments
      </button>
    </div>
  )
}
