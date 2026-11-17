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
          <h1 className="text-2xl font-bold text-slate-900">G�c H?c t?p Sinh vi�n</h1>
          <p className="text-sm text-slate-600 mt-1">
            Xin ch�o <strong>{user?.fullName}</strong> {user?.studentCode ? `(${user.studentCode})` : ''} � Theo d�i ti?n d? h?c ph?n, ph�ng h?c Jitsi v� b�i ki?m tra.
          </p>
        </div>
        <Button variant="primary" size="sm" asChild>
          <Link to="/courses">
            <BookOpen className="w-4 h-4 mr-1.5" /> �ang k� H?c ph?n m?i
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-xs font-medium text-slate-500">H?c ph?n dang h?c</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{activeList.length}</div>
          <div className="text-xs text-emerald-700 mt-1">�� du?c ph� duy?t v�o l?p</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Y�u c?u ch? duy?t</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingList.length}</div>
          <div className="text-xs text-slate-500 mt-1">�ang ch? Gi?ng vi�n / ��o t?o x�t duy?t</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Ti?n d? trung b�nh</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">
            {activeList.length
              ? Math.round(activeList.reduce((acc, e) => acc + (e.progress || 0), 0) / activeList.length)
              : 0}
            %
          </div>
          <div className="text-xs text-slate-500 mt-1">Ho�n th�nh chuong tr�nh</div>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="p-10 rounded-xl bg-white border border-slate-200 text-center space-y-3">
          <p className="text-sm text-slate-600">B?n chua ghi danh h?c ph?n n�o trong k? n�y.</p>
          <Button variant="primary" size="sm" asChild>
            <Link to="/courses">Xem Danh m?c H?c ph?n</Link>
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
                        <CheckCircle2 className="w-3.5 h-3.5" /> {en.progress}% ho�n th�nh
                      </span>
                    ) : en.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Ch? ph� duy?t
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> B? t? ch?i
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold text-base text-slate-900">{en.course?.title}</h2>
                  <p className="text-xs text-slate-500">Gi?ng vi�n: {en.course?.teacher?.fullName}</p>
                  {isApproved && (
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-700 transition-all" style={{ width: `${en.progress}%` }} />
                    </div>
                  )}
                </div>

                {isApproved ? (
                  <Button variant="primary" size="sm" className="w-full" asChild>
                    <Link to={`/courses/${en.course?._id}`}>
                      <PlayCircle className="w-4 h-4 mr-1.5" /> V�o kh�ng gian l?p h?c
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    {en.status === 'pending' ? '�ang ch? ph� duy?t ghi danh' : 'Y�u c?u kh�ng du?c duy?t'}
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
