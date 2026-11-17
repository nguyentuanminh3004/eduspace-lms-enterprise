import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import LoginPage from './pages/public/LoginPage';
import CoursesCatalogPage from './pages/public/CoursesCatalogPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import EnrollmentReviewPage from './pages/admin/EnrollmentReviewPage';
import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import CourseWorkspacePage from './pages/student/CourseWorkspacePage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Đang xác thực phiên làm việc...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback =
      user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<RoleRedirect />} />
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/courses"
                element={
                  <ProtectedRoute>
                    <CoursesCatalogPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/courses/:id"
                element={
                  <ProtectedRoute>
                    <CourseWorkspacePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/enrollments/review"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                    <EnrollmentReviewPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                    <TeacherDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <StudentDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<RoleRedirect />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
