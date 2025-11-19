import { collection, addDoc } from 'firebase/firestore'
import { firestore } from '../config/firebase'

// Script untuk seed dummy payment data ke Firebase
async function seedPayments() {
  const dummyOrders = [
    // Order 1: Transfer - Pending
    {
      orderNumber: `ORD-${Date.now()}-001`,
      customerId: 'user-001',
      customerName: 'Budi Santoso',
      customerEmail: 'budi@example.com',
      customerPhone: '081234567890',
      items: [
        {
          productId: 'prod-001',
          name: 'Pomade Murray\'s',
          price: 75000,
          quantity: 1
        },
        {
          productId: 'prod-002',
          name: 'Sisir Barber',
          price: 25000,
          quantity: 2
        }
      ],
      shippingAddress: {
        fullName: 'Budi Santoso',
        phone: '081234567890',
        address: 'Jl. Merdeka No. 45, Jakarta Pusat'
      },
      paymentMethod: 'transfer',
      paymentProofUrl: 'https://picsum.photos/600/800?random=1',
      paymentProofUploadedAt: new Date(),
      subtotal: 125000,
      discount: 0,
      voucherCode: null,
      voucherId: null,
      tax: 13750,
      totalAmount: 138750,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
    },
    
    // Order 2: COD - Pending
    {
      orderNumber: `ORD-${Date.now()}-002`,
      customerId: 'user-002',
      customerName: 'Andi Wijaya',
      customerEmail: 'andi@example.com',
      customerPhone: '082345678901',
      items: [
        {
          productId: 'prod-003',
          name: 'Wax Rambut',
          price: 50000,
          quantity: 1
        }
      ],
      shippingAddress: {
        fullName: 'Andi Wijaya',
        phone: '082345678901',
        address: 'Jl. Sudirman No. 123, Jakarta Selatan'
      },
      paymentMethod: 'cash',
      paymentProofUrl: null,
      subtotal: 50000,
      discount: 5000,
      voucherCode: 'WELCOME10',
      voucherId: 'voucher-001',
      tax: 4950,
      totalAmount: 49950,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
    },
    
    // Order 3: Transfer - Paid (Berhasil)
    {
      orderNumber: `ORD-${Date.now()}-003`,
      customerId: 'user-003',
      customerName: 'Dewi Lestari',
      customerEmail: 'dewi@example.com',
      customerPhone: '083456789012',
      items: [
        {
          productId: 'prod-004',
          name: 'Hair Tonic',
          price: 35000,
          quantity: 3
        }
      ],
      shippingAddress: {
        fullName: 'Dewi Lestari',
        phone: '083456789012',
        address: 'Jl. Asia Afrika No. 78, Bandung'
      },
      paymentMethod: 'transfer',
      paymentProofUrl: 'https://picsum.photos/600/800?random=2',
      paymentProofUploadedAt: new Date(Date.now() - 3600000), // 1 jam lalu
      subtotal: 105000,
      discount: 0,
      voucherCode: null,
      voucherId: null,
      tax: 11550,
      totalAmount: 116550,
      status: 'paid',
      paymentVerifiedAt: new Date(),
      paymentVerifiedBy: 'admin',
      verificationNotes: 'Transfer verified via bank statement',
      createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 jam lalu
    },
    
    // Order 4: COD - Paid (Berhasil)
    {
      orderNumber: `ORD-${Date.now()}-004`,
      customerId: 'user-004',
      customerName: 'Rudi Hartono',
      customerEmail: 'rudi@example.com',
      customerPhone: '084567890123',
      items: [
        {
          productId: 'prod-005',
          name: 'Shampoo Anti Ketombe',
          price: 45000,
          quantity: 2
        }
      ],
      shippingAddress: {
        fullName: 'Rudi Hartono',
        phone: '084567890123',
        address: 'Jl. Diponegoro No. 234, Surabaya'
      },
      paymentMethod: 'cash',
      paymentProofUrl: null,
      subtotal: 90000,
      discount: 0,
      voucherCode: null,
      voucherId: null,
      tax: 9900,
      totalAmount: 99900,
      status: 'paid',
      paymentVerifiedAt: new Date(Date.now() - 1800000), // 30 menit lalu
      paymentVerifiedBy: 'admin',
      verificationNotes: 'Customer sudah datang dan bayar tunai',
      createdAt: new Date(Date.now() - 5400000).toISOString(), // 1.5 jam lalu
    },
    
    // Order 5: Transfer - Cancelled (Rejected)
    {
      orderNumber: `ORD-${Date.now()}-005`,
      customerId: 'user-005',
      customerName: 'Siti Nurhaliza',
      customerEmail: 'siti@example.com',
      customerPhone: '085678901234',
      items: [
        {
          productId: 'prod-006',
          name: 'Conditioner',
          price: 40000,
          quantity: 1
        }
      ],
      shippingAddress: {
        fullName: 'Siti Nurhaliza',
        phone: '085678901234',
        address: 'Jl. Gatot Subroto No. 567, Yogyakarta'
      },
      paymentMethod: 'transfer',
      paymentProofUrl: 'https://picsum.photos/600/800?random=3',
      paymentProofUploadedAt: new Date(Date.now() - 10800000), // 3 jam lalu
      subtotal: 40000,
      discount: 0,
      voucherCode: null,
      voucherId: null,
      tax: 4400,
      totalAmount: 44400,
      status: 'payment_rejected',
      paymentRejectedAt: new Date(Date.now() - 9000000), // 2.5 jam lalu
      paymentRejectedBy: 'admin',
      rejectionReason: 'Nominal tidak sesuai dengan total pembayaran',
      createdAt: new Date(Date.now() - 14400000).toISOString(), // 4 jam lalu
    },
  ]

  console.log('🚀 Mulai seed dummy payments...')
  
  try {
    for (const order of dummyOrders) {
      const docRef = await addDoc(collection(firestore, 'orders'), order)
      console.log(`✅ Order created: ${order.orderNumber} (${docRef.id})`)
    }
    
    console.log('🎉 Seeding berhasil!')
    console.log(`Total: ${dummyOrders.length} orders`)
  } catch (error) {
    console.error('❌ Error seeding:', error)
  }
}

// Uncomment line di bawah untuk run script
// seedPayments()

export { seedPayments }
