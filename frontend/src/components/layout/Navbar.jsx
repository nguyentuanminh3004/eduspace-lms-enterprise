import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserCheck,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../services/api';
import { Button } from '../ui/button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const getDashboardPath = () => {
    if (user.role === 'admin') return '/admin';
    if (user.role === 'teacher') return '/teacher';
    return '/student';
  };

  const isActive = (path) => location.pathname === path;
  const avatarUrl = getAvatarUrl(user.avatar);

  return (
    <>
      {user.mustChangePassword && location.pathname !== '/profile' && (
        <div className="bg-amber-600 text-white text-xs sm:text-sm py-2 px-4 text-center font-medium">
          Cảnh báo bảo mật: Tài khoản đang sử dụng mật khẩu mặc định.{' '}
          <Link to="/profile?tab=security" className="underline font-bold ml-1">
            Đổi mật khẩu ngay để kích hoạt đầy đủ quyền truy cập
          </Link>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to={getDashboardPath()} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-base tracking-tight text-slate-900 block">EduSpace</span>
                <span className="text-[11px] font-medium text-slate-500 block">Enterprise LMS</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                to={getDashboardPath()}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive(getDashboardPath())
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {user.role === 'admin' ? <ShieldCheck className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                {user.role === 'admin'
                  ? 'Quản trị Hệ thống'
                  : user.role === 'teacher'
                  ? 'Không gian Giảng dạy'
                  : 'Góc Học tập'}
              </Link>

              <Link
                to="/courses"
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/courses')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" /> Danh mục Học phần
              </Link>

              {(user.role === 'admin' || user.role === 'teacher') && (
                <Link
                  to="/enrollments/review"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    isActive('/enrollments/review')
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> Duyệt Ghi danh
                </Link>
              )}

              <Link
                to="/profile"
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  isActive('/profile')
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <UserCog className="w-4 h-4" /> Hồ sơ & Bảo mật
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="hidden sm:flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-colors"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.fullName} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center">
                  {user.fullName?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-slate-800 max-w-[140px] truncate">{user.fullName}</span>
              <span
                className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded text-white ${
                  user.role === 'admin'
                    ? 'bg-purple-700'
                    : user.role === 'teacher'
                    ? 'bg-blue-700'
                    : 'bg-emerald-700'
                }`}
              >
                {user.role}
              </span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut className="w-4 h-4 mr-1.5" /> Đăng xuất
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
