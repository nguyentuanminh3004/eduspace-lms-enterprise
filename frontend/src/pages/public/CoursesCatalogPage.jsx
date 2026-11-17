import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, KeyRound, Search, Users, XCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import MiniSubjectBadge3D from '../../components/three/MiniSubjectBadge3D';

export default function CoursesCatalogPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState({});
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [notice, setNotice] = useState('');

  const fetchData = async () => {
    const [cRes, enRes] = await Promise.all([
      api.get('/courses', { params: { search, category: selectedCategory } }),
      user?.role === 'student' ? api.get('/enrollments/my').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]);
    setCourses(cRes.data);
    const map = {};
    (enRes.data || []).forEach((e) => {
      const cid = e.course?._id || e.course;
      if (cid) map[cid] = e.status;
    });
    setMyEnrollments(map);
  };

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleRequestEnroll = async (course) => {
    try {
      const { data } = await api.post(`/courses/${course._id}/enroll`, {});
      setNotice(data.message || 'Đã gửi yêu cầu ghi danh học phần.');
      fetchData();
    } catch (err) {
      if (err.response?.data?.message?.includes('Mã ghi danh')) {
        const key = window.prompt(`Học phần [${course.code}] yêu cầu mã ghi danh lớp học:`);
        if (!key) return;
        try {
          const { data } = await api.post(`/courses/${course._id}/enroll`, { enrollmentKey: key });
          setNotice(data.message);
          fetchData();
        } catch (err2) {
          alert(err2.response?.data?.message || 'Mã ghi danh không chính xác.');
        }
      } else {
        alert(err.response?.data?.message || 'Không thể đăng ký học phần.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh mục Học phần Nội bộ</h1>
          <p className="text-sm text-slate-600 mt-1">
            Các học phần đang mở ghi danh trong kỳ học hiện tại. Sinh viên gửi yêu cầu ghi danh để Giảng viên/Đào tạo phê duyệt.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchData();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tên học phần, mã HP..."
              className="h-9 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-md w-60"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-3 text-sm bg-white border border-slate-300 rounded-md"
          >
            <option value="">Tất cả chuyên ngành</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="primary" size="sm">
            Lọc
          </Button>
        </form>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800 font-medium">
          {notice}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course, idx) => {
          const status = myEnrollments[course._id];
          const isOwnerOrAdmin =
            user?.role === 'admin' || String(course.teacher?._id) === String(user?._id);

          return (
            <div
              key={course._id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-blue-300 transition-colors shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <MiniSubjectBadge3D
                    color={course.category?.color || '#1d4ed8'}
                    shape={idx % 2 === 0 ? 'dodecahedron' : 'octahedron'}
                  />
                  <div className="flex items-center gap-1.5">
                    {status === 'active' || status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Đã duyệt
                      </span>
                    ) : status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" /> Chờ duyệt
                      </span>
                    ) : status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        <XCircle className="w-3 h-3" /> Từ chối
                      </span>
                    ) : null}
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {course.code}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-blue-700">{course.category?.name}</span>
                  <h2 className="font-semibold text-base text-slate-900 mt-1">{course.title}</h2>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-3">{course.description}</p>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> {course.teacher?.fullName}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <BookOpen className="w-3.5 h-3.5" /> {course.lessons?.length || 0} chương
                  </div>
                </div>

                {isOwnerOrAdmin || status === 'active' || status === 'completed' ? (
                  <Button variant="primary" size="sm" asChild>
                    <Link to={`/courses/${course._id}`}>Vào lớp học</Link>
                  </Button>
                ) : status === 'pending' ? (
                  <Button variant="outline" size="sm" disabled>
                    Đang chờ duyệt
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleRequestEnroll(course)}>
                    <KeyRound className="w-3.5 h-3.5 mr-1" /> Đăng ký học phần
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
