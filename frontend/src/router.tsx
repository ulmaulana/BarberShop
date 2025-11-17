import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LandingPage } from './pages/public/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage'
import { DashboardPage } from './pages/DashboardPage'
import { ServicesListPage } from './pages/services/ServicesListPage'
import { BookingPage } from './pages/booking/BookingPage'
import { MyAppointmentsPage } from './pages/appointments/MyAppointmentsPage'
import { NewAppointmentPage } from './pages/appointments/NewAppointmentPage'
import { QueuePage } from './pages/queue/QueuePage'
import { ProductsListPage } from './pages/products/ProductsListPage'
import { ProductDetailPage } from './pages/products/ProductDetailPage'
import { ShoppingCartPage } from './pages/cart/ShoppingCartPage'
import { CheckoutPage } from './pages/checkout/CheckoutPage'
import { OrdersListPage } from './pages/orders/OrdersListPage'
import { MyOrdersPage } from './pages/orders/MyOrdersPage'
import { OrderConfirmationPage } from './pages/orders/OrderConfirmationPage'
import { BarberDashboardPage } from './pages/barber/BarberDashboardPage'
import { CashierDashboardPage } from './pages/cashier/CashierDashboardPage'
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage'
import { ReviewAppointmentPage } from './pages/appointments/ReviewAppointmentPage'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { ProductsListPage as AdminProductsListPage } from './pages/admin/products/ProductsListPage'
import { ServicesListPage as AdminServicesListPage } from './pages/admin/services/ServicesListPage'
import { BarbersListPage as AdminBarbersListPage } from './pages/admin/barbers/BarbersListPage'
import { UsersListPage as AdminUsersListPage } from './pages/admin/users/UsersListPage'
import { FinancialDashboardPage } from './pages/admin/financial/FinancialDashboardPage'
import { ExpensesPage } from './pages/admin/financial/ExpensesPage'
import { PaymentsListPage } from './pages/admin/payments/PaymentsListPage'

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
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="cart" element={<ShoppingCartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="orders" element={<MyOrdersPage />} />
        <Route path="orders/:orderId/confirmation" element={<OrderConfirmationPage />} />
        <Route path="booking" element={<BookingPage />} />
      </Route>

      <Route path="/" element={<Layout requireSidebar />}>
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
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
          path="products/:id"
          element={
            <ProtectedRoute>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrdersListPage />
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
      </Route>
      
      {/* Admin Panel - Public Login */}
      <Route path="/adminpanel" element={<AdminLoginPage />} />
      
      {/* Admin Panel - Protected Routes */}
      <Route
        path="/adminpanel"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsListPage />} />
        <Route path="services" element={<AdminServicesListPage />} />
        <Route path="barbers" element={<AdminBarbersListPage />} />
        <Route path="users" element={<AdminUsersListPage />} />
        <Route path="financial" element={<FinancialDashboardPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="payments" element={<PaymentsListPage />} />
        {/* TODO: Add more admin routes (reports, settings, etc) */}
      </Route>
    </>,
  ),
)
