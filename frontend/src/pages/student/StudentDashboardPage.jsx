import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, PlayCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    api.get('/enrollments/my').then((res) => setEnrollments(res.data));
  }, []);

  const activeList = enrollments.filter((e) => e.status === 'active' || e.status === 'completed');
  const pendingList = enrollments.filter((e) => e.status === 'pending');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Góc Học tập Sinh viên</h1>
          <p className="text-sm text-slate-600 mt-1">
            Xin chào <strong>{user?.fullName}</strong> {user?.studentCode ? `(${user.studentCode})` : ''} • Theo dõi tiến độ học phần, phòng học Jitsi và bài kiểm tra.
          </p>
        </div>
        <Button variant="primary" size="sm" asChild>
          <Link to="/courses">
            <BookOpen className="w-4 h-4 mr-1.5" /> Đăng ký Học phần mới
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Học phần đang học</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{activeList.length}</div>
          <div className="text-xs text-emerald-700 mt-1">Đã được phê duyệt vào lớp</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Yêu cầu chờ duyệt</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingList.length}</div>
          <div className="text-xs text-slate-500 mt-1">Đang chờ Giảng viên / Đào tạo xét duyệt</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Tiến độ trung bình</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {activeList.length
              ? Math.round(activeList.reduce((acc, e) => acc + (e.progress || 0), 0) / activeList.length)
              : 0}
            %
          </div>
          <div className="text-xs text-slate-500 mt-1">Hoàn thành chương trình</div>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="p-10 rounded-xl bg-white border border-slate-200 text-center space-y-3">
          <p className="text-sm text-slate-600">Bạn chưa ghi danh học phần nào trong kỳ này.</p>
          <Button variant="primary" size="sm" asChild>
            <Link to="/courses">Xem Danh mục Học phần</Link>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((en) => {
            const isApproved = en.status === 'active' || en.status === 'completed';
            return (
              <div key={en._id} className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100">
                      {en.course?.code}
                    </span>
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {en.progress}% hoàn thành
                      </span>
                    ) : en.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Chờ phê duyệt
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Bị từ chối
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold text-base text-slate-900">{en.course?.title}</h2>
                  <p className="text-xs text-slate-500">Giảng viên: {en.course?.teacher?.fullName}</p>
                  {isApproved && (
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-700 transition-all" style={{ width: `${en.progress}%` }} />
                    </div>
                  )}
                </div>

                {isApproved ? (
                  <Button variant="primary" size="sm" className="w-full" asChild>
                    <Link to={`/courses/${en.course?._id}`}>
                      <PlayCircle className="w-4 h-4 mr-1.5" /> Vào không gian lớp học
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    {en.status === 'pending' ? 'Đang chờ phê duyệt ghi danh' : 'Yêu cầu không được duyệt'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
