import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';

export default function TeacherDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', code: '', description: '', category: '', level: 'Cơ bản' });

  const loadData = async () => {
    const [cRes, catRes] = await Promise.all([api.get('/teacher/courses'), api.get('/categories')]);
    setCourses(cRes.data);
    setCategories(catRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/courses', form);
      setOpen(false);
      setForm({ title: '', code: '', description: '', category: '', level: 'Cơ bản' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi tạo học phần.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Không gian Giảng dạy & Giám sát</h1>
          <p className="text-sm text-slate-600 mt-1">
            Quản lý đề cương, mở lớp Jitsi Meet, giám sát vi phạm thi cử và kiểm tra trùng lặp bài nộp.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Tạo Học phần mới
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course._id} className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100">{course.code}</span>
              <h2 className="font-semibold text-base text-slate-900">{course.title}</h2>
              <p className="text-xs text-slate-600 line-clamp-2">{course.description}</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" /> {course.lessons?.length || 0} bài giảng
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/courses/${course._id}`}>Điều phối lớp</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo Học phần Mới</DialogTitle>
            <DialogDescription>Khai báo thông tin môn học giảng dạy trong kỳ.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Mã HP *</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full h-9 px-3 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Tên học phần *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Chuyên ngành</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="">-- Chọn chuyên ngành --</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Mô tả học phần *</label>
              <textarea
                rows={3}
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                Khởi tạo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
