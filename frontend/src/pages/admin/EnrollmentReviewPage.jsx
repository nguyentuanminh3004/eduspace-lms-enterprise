import { useEffect, useState } from 'react';
import { Check, RefreshCw, ShieldCheck, UserCheck, X } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/button';

export default function EnrollmentReviewPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [filter, setFilter] = useState('all');
  const [banner, setBanner] = useState('');

  const loadData = async () => {
    const { data } = await api.get('/enrollments');
    setEnrollments(data.enrollments || []);
    setAutoApprove(Boolean(data.autoApproveEnrollment));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReview = async (id, status) => {
    try {
      const { data } = await api.patch(`/enrollments/${id}/review`, { status });
      setBanner(data.message);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Thao tác phê duyệt thất bại.');
    }
  };

  const handleToggleAuto = async () => {
    try {
      const { data } = await api.patch('/enrollments/settings/auto-approve', {
        autoApproveEnrollment: !autoApprove,
      });
      setAutoApprove(!autoApprove);
      setBanner(data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể đổi cấu hình.');
    }
  };

  const filtered = enrollments.filter((item) => (filter === 'all' ? true : item.status === filter));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Phê duyệt Yêu cầu Ghi danh Học phần</h1>
          <p className="text-sm text-slate-600 mt-1">
            {user?.role === 'admin'
              ? 'Quản trị viên xem và xét duyệt toàn bộ yêu cầu đăng ký lớp học trên hệ thống.'
              : 'Giảng viên xét duyệt sinh viên đăng ký vào các học phần do bạn phụ trách.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <Button variant={autoApprove ? 'primary' : 'outline'} size="sm" onClick={handleToggleAuto}>
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Duyệt tự động: {autoApprove ? 'ĐANG BẬT' : 'THỦ CÔNG'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Làm mới
          </Button>
        </div>
      </div>

      {banner && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium">
          {banner}
        </div>
      )}

      <div className="flex gap-2">
        {[
          { id: 'all', label: `Tất cả (${enrollments.length})` },
          { id: 'pending', label: `Chờ duyệt (${enrollments.filter((e) => e.status === 'pending').length})` },
          { id: 'active', label: `Đã duyệt (${enrollments.filter((e) => e.status === 'active').length})` },
          { id: 'rejected', label: `Từ chối (${enrollments.filter((e) => e.status === 'rejected').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              filter === tab.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Sinh viên</th>
              <th className="px-4 py-3">Học phần đăng ký</th>
              <th className="px-4 py-3">Thời gian gửi</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Phê duyệt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  <UserCheck className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                  Không có yêu cầu ghi danh nào trong mục này.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{item.student?.fullName}</div>
                    <div className="text-xs text-slate-500">
                      {item.student?.studentCode ? `${item.student.studentCode} • ` : ''}
                      {item.student?.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 mr-2">
                      {item.course?.code}
                    </span>
                    <span className="font-medium text-slate-800">{item.course?.title}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.status === 'active' || item.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {item.status === 'pending'
                        ? 'Chờ duyệt'
                        : item.status === 'rejected'
                        ? 'Từ chối'
                        : 'Đã duyệt'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {item.status === 'pending' ? (
                      <>
                        <Button variant="primary" size="sm" onClick={() => handleReview(item._id, 'active')}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Duyệt
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleReview(item._id, 'rejected')}>
                          <X className="w-3.5 h-3.5 mr-1 text-red-600" /> Từ chối
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {item.reviewedBy ? `Bởi: ${item.reviewedBy.fullName}` : 'Tự động'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
