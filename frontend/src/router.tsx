import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LandingPage } from './pages/public/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage'
import { ServicesListPage } from './pages/services/ServicesListPage'
import { BookingPage } from './pages/booking/BookingPage'
import { MyAppointmentsPage } from './pages/appointments/MyAppointmentsPage'
import { NewAppointmentPage } from './pages/appointments/NewAppointmentPage'
import { AppointmentDetailPage } from './pages/appointments/AppointmentDetailPage'
import { RescheduleAppointmentPage } from './pages/appointments/RescheduleAppointmentPage'
import { QueuePage } from './pages/queue/QueuePage'
import { ProductsListPage } from './pages/products/ProductsListPage'
import { ShoppingCartPage } from './pages/cart/ShoppingCartPage'
import { CheckoutPage } from './pages/checkout/CheckoutPage'
import { MyOrdersPage } from './pages/orders/MyOrdersPage'
import { OrderConfirmationPage } from './pages/orders/OrderConfirmationPage'
import { BarberDashboardPage } from './pages/barber/BarberDashboardPage'
import { CashierDashboardPage } from './pages/cashier/CashierDashboardPage'
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage'
import { ReviewAppointmentPage } from './pages/appointments/ReviewAppointmentPage'
import { EditProfilePage } from './pages/profile/EditProfilePage'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminProtectedRoute } from './components/admin/AdminProtectedRoute'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { ProductsListPage as AdminProductsListPage } from './pages/admin/products/ProductsListPage'
import { ServicesListPage as AdminServicesListPage } from './pages/admin/services/ServicesListPage'
import { AppointmentsListPage as AdminAppointmentsListPage } from './pages/admin/appointments/AppointmentsListPage'
import { BarbersListPage as AdminBarbersListPage } from './pages/admin/barbers/BarbersListPage'
import { FinancialDashboardPage } from './pages/admin/financial/FinancialDashboardPage'
import { ExpensesPage } from './pages/admin/financial/ExpensesPage'
import { PaymentsListPage } from './pages/admin/payments/PaymentsListPage'
import { VouchersListPage } from './pages/admin/vouchers/VouchersListPage'

export const appRouter = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="services" element={<ServicesListPage />} />
        <Route path="products" element={<ProductsListPage />} />
        <Route path="cart" element={<ShoppingCartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="booking" element={<BookingPage />} />
      </Route>

      <Route path="/" element={<Layout requireSidebar />}>
        <Route
          path="appointments"
          element={
            <ProtectedRoute>
              <MyAppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="appointments/new"
          element={
            <ProtectedRoute>
              <NewAppointmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="appointments/:appointmentId"
          element={
            <ProtectedRoute>
              <AppointmentDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="appointments/:appointmentId/reschedule"
          element={
            <ProtectedRoute>
              <RescheduleAppointmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="queue"
          element={
            <ProtectedRoute>
              <QueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="products"
          element={
            <ProtectedRoute>
              <ProductsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <MyOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:orderId/confirmation"
          element={
            <ProtectedRoute>
              <OrderConfirmationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="barber/dashboard"
          element={
            <ProtectedRoute allowedRoles={['barber', 'owner', 'admin']}>
              <BarberDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="cashier/dashboard"
          element={
            <ProtectedRoute allowedRoles={['cashier', 'owner', 'admin']}>
              <CashierDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="owner/dashboard"
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <OwnerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="appointments/:id/review"
          element={
            <ProtectedRoute>
              <ReviewAppointmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile/edit"
          element={
            <ProtectedRoute>
              <EditProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>
      
      {/* Admin Panel - Separate Auth Context */}
      <Route
        path="/adminpanel"
        element={
          <AdminAuthProvider>
            <AdminLoginPage />
          </AdminAuthProvider>
        }
      />
      
      {/* Admin Panel - Protected Routes */}
      <Route
        path="/adminpanel"
        element={
          <AdminAuthProvider>
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          </AdminAuthProvider>
        }
      >
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsListPage />} />
        <Route path="services" element={<AdminServicesListPage />} />
        <Route path="appointments" element={<AdminAppointmentsListPage />} />
        <Route path="barbers" element={<AdminBarbersListPage />} />
        <Route path="financial" element={<FinancialDashboardPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="payments" element={<PaymentsListPage />} />
        <Route path="vouchers" element={<VouchersListPage />} />
      </Route>
    </>,
  ),
)
