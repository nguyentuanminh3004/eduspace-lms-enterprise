import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import AcademicCampusScene from '../../components/three/AcademicCampusScene';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/teacher');
      else navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Xác thực không thành công. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden grid lg:grid-cols-12">
        {/* Cột trái: Không gian 3D Giáo dục & Thông tin hệ thống */}
        <div className="lg:col-span-6 p-8 bg-slate-900 text-white flex flex-col justify-between space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight">EduSpace LMS</div>
              <div className="text-xs text-slate-400">Online Classroom & Academic Governance</div>
            </div>
          </div>

          <AcademicCampusScene className="h-[280px] w-full border-slate-700" />

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-white">Cổng Đào tạo Nội bộ Tập trung</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hệ thống lớp học trực tuyến bảo mật cao dành cho giảng viên và học viên được cấp quyền. Tích hợp phòng học Jitsi WebRTC, giám sát thi cử thời gian thực và kiểm tra trùng lặp học thuật.
            </p>
          </div>
        </div>

        {/* Cột phải: Form Đăng nhập Sạch & Bảo mật (Không lộ tài khoản mẫu, không cho tự đăng ký) */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center space-y-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
              <LockKeyhole className="w-3.5 h-3.5" /> Xác thực định danh
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Đăng nhập Hệ thống</h1>
            <p className="text-sm text-slate-500">
              Nhập tài khoản email và mật khẩu được Phòng Đào tạo / Quản trị viên cấp phát.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Email định danh</label>
              <input
                type="email"
                required
                autoComplete="username"
                placeholder="name@eduspace.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Mật khẩu</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full h-10" disabled={loading}>
              {loading ? 'Đang kiểm tra thông tin...' : 'Đăng nhập vào Cổng Đào tạo'}
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Hệ thống không hỗ trợ đăng ký tự do. Trường hợp chưa có tài khoản hoặc quên mật khẩu, vui lòng liên hệ trực tiếp Quản trị viên hệ thống để được cấp lại.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
