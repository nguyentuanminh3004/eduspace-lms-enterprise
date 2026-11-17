import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Edit3,
  FileSpreadsheet,
  FolderKanban,
  History,
  Plus,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import api from '../../services/api';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [logs, setLogs] = useState([]);
  const [banner, setBanner] = useState('');

  // Modal: Cấp phát / Chỉnh sửa User
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    role: 'student',
    department: 'Khoa Công Nghệ Thông Tin',
    studentCode: '',
    phone: '',
    bio: '',
    isActive: true,
    mustChangePassword: true,
    newPassword: '',
  });

  // Modal: Nhập CSV hàng loạt
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);

  // Modal: Chỉnh sửa Học phần cho Admin
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    code: '',
    description: '',
    category: '',
    teacher: '',
    level: 'Cơ bản',
    status: 'published',
    isFeatured: false,
    maxStudents: 100,
    enrollmentKey: '',
  });

  // Modal: Danh mục
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', color: '#1d4ed8', isActive: true });

  const showNotice = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(''), 4500);
  };

  const loadAll = async () => {
    const [statsRes, usersRes, coursesRes, catsRes, logsRes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
      api.get('/admin/courses'),
      api.get('/categories'),
      api.get('/admin/audit-logs'),
    ]);
    setStats(statsRes.data.overview);
    setUsers(usersRes.data);
    setCourses(coursesRes.data);
    setCategories(catsRes.data);
    setLogs(logsRes.data);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ==================== USER PROVISIONING & FULL EDIT ====================
  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      fullName: '',
      email: '',
      role: 'student',
      department: 'Khoa Công Nghệ Thông Tin',
      studentCode: '',
      phone: '',
      bio: '',
      isActive: true,
      mustChangePassword: true,
      newPassword: '',
    });
    setUserModalOpen(true);
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role || 'student',
      department: user.department || '',
      studentCode: user.studentCode || '',
      phone: user.phone || '',
      bio: user.bio || '',
      isActive: user.isActive !== false,
      mustChangePassword: Boolean(user.mustChangePassword),
      newPassword: '',
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser._id}`, userForm);
        showNotice(`Đã cập nhật hồ sơ tài khoản ${userForm.fullName}.`);
      } else {
        await api.post('/admin/users', {
          ...userForm,
          password: userForm.newPassword,
        });
        showNotice(`Đã cấp phát tài khoản mới cho ${userForm.fullName}.`);
      }
      setUserModalOpen(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi lưu dữ liệu người dùng.');
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    const formData = new FormData();
    formData.append('csvFile', csvFile);
    try {
      const { data } = await api.post('/admin/users/import-csv', formData);
      setCsvResult(data);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi xử lý tệp CSV.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Xác nhận xóa vĩnh viễn tài khoản ${user.fullName} (${user.email})?`)) return;
    try {
      await api.delete(`/admin/users/${user._id}`);
      showNotice(`Đã xóa tài khoản ${user.email}.`);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa tài khoản.');
    }
  };

  // ==================== COURSE FULL EDIT ====================
  const openEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title || '',
      code: course.code || '',
      description: course.description || '',
      category: course.category?._id || '',
      teacher: course.teacher?._id || '',
      level: course.level || 'Cơ bản',
      status: course.status || 'published',
      isFeatured: Boolean(course.isFeatured),
      maxStudents: course.maxStudents || 100,
      enrollmentKey: course.enrollmentKey || '',
    });
    setCourseModalOpen(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/courses/${editingCourse._id}`, courseForm);
      showNotice(`Đã cập nhật thông tin học phần [${courseForm.code}] ${courseForm.title}.`);
      setCourseModalOpen(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật học phần.');
    }
  };

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`Xóa học phần [${course.code}] ${course.title}?`)) return;
    try {
      await api.delete(`/admin/courses/${course._id}`);
      showNotice(`Đã xóa học phần ${course.code}.`);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi xóa học phần.');
    }
  };

  // ==================== CATEGORY ====================
  const openCategoryModal = (cat = null) => {
    setEditingCategory(cat);
    setCatForm(
      cat
        ? { name: cat.name, description: cat.description || '', color: cat.color || '#1d4ed8', isActive: cat.isActive }
        : { name: '', description: '', color: '#1d4ed8', isActive: true }
    );
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory._id}`, catForm);
        showNotice('Đã cập nhật danh mục chuyên ngành.');
      } else {
        await api.post('/admin/categories', catForm);
        showNotice('Đã tạo danh mục mới.');
      }
      setCatModalOpen(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi lưu danh mục.');
    }
  };

  const userColumns = useMemo(
    () => [
      {
        accessorKey: 'fullName',
        header: 'Học viên / Cán bộ',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900">{row.original.fullName}</div>
            <div className="text-xs text-slate-500">{row.original.email}</div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Vai trò',
        cell: ({ row }) => {
          const r = row.original.role;
          const cls =
            r === 'admin'
              ? 'bg-purple-100 text-purple-800'
              : r === 'teacher'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-slate-100 text-slate-800';
          return <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${cls}`}>{r}</span>;
        },
      },
      {
        accessorKey: 'department',
        header: 'Khoa / Mã định danh',
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="text-slate-700">{row.original.department || '—'}</div>
            {row.original.studentCode && <div className="font-mono text-slate-500">{row.original.studentCode}</div>}
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.isActive ? (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Đang hoạt động
            </span>
          ) : (
            <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
              Đình chỉ
            </span>
          ),
      },
      {
        id: 'actions',
        header: 'Quản trị',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => openEditUser(row.original)}>
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Chỉnh sửa
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(row.original)}>
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const courseColumns = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã HP',
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.code}</span>,
      },
      {
        accessorKey: 'title',
        header: 'Tên học phần',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900">{row.original.title}</div>
            <div className="text-xs text-slate-500">
              GV: {row.original.teacher?.fullName || 'Chưa phân công'} • {row.original.category?.name || 'Chưa phân loại'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const st = row.original.status;
          const style =
            st === 'published'
              ? 'bg-emerald-50 text-emerald-700'
              : st === 'draft'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-slate-100 text-slate-600';
          return <span className={`px-2 py-0.5 rounded text-xs font-medium ${style}`}>{st}</span>;
        },
      },
      {
        accessorKey: 'maxStudents',
        header: 'Sĩ số tối đa',
        cell: ({ row }) => <span className="text-xs font-mono">{row.original.maxStudents}</span>,
      },
      {
        id: 'actions',
        header: 'Quản trị',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => openEditCourse(row.original)}>
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Chỉnh sửa
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteCourse(row.original)}>
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
            </Button>
          </div>
        ),
      },
    ],
    [users, categories]
  );

  const teachersList = users.filter((u) => u.role === 'teacher' || u.role === 'admin');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản trị Đào tạo & Bảo mật Tập trung</h1>
          <p className="text-sm text-slate-600 mt-1">
            Cấp phát tài khoản, nhập danh sách CSV, chỉnh sửa hồ sơ người dùng, điều phối học phần và giám sát nhật ký hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={openCreateUser}>
            <UserPlus className="w-4 h-4 mr-1.5" /> Cấp tài khoản mới
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCsvResult(null);
              setCsvModalOpen(true);
            }}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Nhập hàng loạt CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => openCategoryModal(null)}>
            <Plus className="w-4 h-4 mr-1.5" /> Thêm danh mục
          </Button>
        </div>
      </div>

      {banner && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium">
          {banner}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Tài khoản được cấp</span>
              <Users className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.totalUsers}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.totalTeachers} GV • {stats.totalStudents} HV • {stats.lockedUsers} khóa
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Học phần đào tạo</span>
              <BookOpen className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.totalCourses}</div>
            <div className="text-xs text-slate-500 mt-1">{stats.publishedCourses} đang mở lớp</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Lượt ghi danh lớp học</span>
              <UserCheck className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.totalEnrollments}</div>
            <div className="text-xs text-slate-500 mt-1">{stats.totalQuizzes} bài thi giám sát</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Phòng học Jitsi Live</span>
              <ShieldAlert className="w-4 h-4 text-purple-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.activeLiveSessions}</div>
            <div className="text-xs text-slate-500 mt-1">Phiên trực tuyến hoạt động</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'users', label: 'Quản lý Người dùng (Cấp phát & Sửa)', icon: Users },
          { id: 'courses', label: 'Quản lý Học phần (Sửa & Điều phối)', icon: BookOpen },
          { id: 'categories', label: 'Danh mục Chuyên ngành', icon: FolderKanban },
          { id: 'logs', label: 'Nhật ký Kiểm toán & Cảnh báo Vi phạm', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'users' && (
        <DataTable columns={userColumns} data={users} searchPlaceholder="Tìm theo họ tên, email, mã định danh..." />
      )}

      {activeTab === 'courses' && (
        <DataTable columns={courseColumns} data={courses} searchPlaceholder="Tìm theo mã học phần, tên môn..." />
      )}

      {activeTab === 'categories' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat._id} className="p-4 rounded-xl bg-white border border-slate-200 flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                </div>
                <p className="text-xs text-slate-500">{cat.description || 'Không có mô tả'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openCategoryModal(cat)}>
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div className="flex items-start sm:items-center gap-2">
                <span
                  className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                    log.severity === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : log.severity === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {log.action}
                </span>
                <span className="text-slate-800">{log.details}</span>
              </div>
              <div className="text-xs text-slate-500 shrink-0">
                {log.actor?.fullName} • {formatDateTime(log.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== MODAL CẤP PHÁT & CHỈNH SỬA NGƯỜI DÙNG ==================== */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? `Chỉnh sửa Hồ sơ: ${editingUser.fullName}` : 'Cấp phát Tài khoản Mới'}
            </DialogTitle>
            <DialogDescription>
              Thiết lập thông tin định danh, phân quyền RBAC, trạng thái khóa/mở và mật khẩu truy cập.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email định danh *</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Vai trò RBAC</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white"
                >
                  <option value="student">Học viên (student)</option>
                  <option value="teacher">Giảng viên (teacher)</option>
                  <option value="admin">Quản trị (admin)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mã SV / Cán bộ</label>
                <input
                  type="text"
                  value={userForm.studentCode}
                  onChange={(e) => setUserForm({ ...userForm, studentCode: e.target.value })}
                  className="w-full h-9 px-3 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Khoa / Đơn vị</label>
                <input
                  type="text"
                  value={userForm.department}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {editingUser ? 'Đặt lại mật khẩu mới (bỏ trống nếu giữ nguyên)' : 'Mật khẩu khởi tạo *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  placeholder="Tối thiểu 6 ký tự"
                  value={userForm.newPassword}
                  onChange={(e) => setUserForm({ ...userForm, newPassword: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={userForm.isActive}
                  onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                />
                Tài khoản đang kích hoạt (Bỏ chọn để đình chỉ truy cập ngay lập tức)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={userForm.mustChangePassword}
                  onChange={(e) => setUserForm({ ...userForm, mustChangePassword: e.target.checked })}
                />
                Yêu cầu người dùng đổi mật khẩu ở lần đăng nhập kế tiếp
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                Lưu thông tin tài khoản
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL NHẬP CSV HÀNG LOẠT ==================== */}
      <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nhập danh sách Người dùng hàng loạt (CSV)</DialogTitle>
            <DialogDescription>
              Tệp CSV cần có các cột tiêu đề: <code className="font-mono text-xs">fullName,email,password,role,studentCode,department</code>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCsvUpload} className="space-y-4">
            <input
              type="file"
              accept=".csv"
              required
              onChange={(e) => setCsvFile(e.target.files[0])}
              className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
            />
            {csvResult && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-semibold text-emerald-700">{csvResult.message}</div>
                {csvResult.errors?.map((err, i) => (
                  <div key={i} className="text-red-600">• {err}</div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCsvModalOpen(false)}>
                Đóng
              </Button>
              <Button type="submit" variant="primary">
                Tải lên & Cấp phát
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL CHỈNH SỬA HỌC PHẦN CHO ADMIN ==================== */}
      <Dialog open={courseModalOpen} onOpenChange={setCourseModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Học phần: {editingCourse?.code}</DialogTitle>
            <DialogDescription>
              Điều chỉnh thông tin môn học, phân công giảng viên phụ trách, mã ghi danh lớp và trạng thái xuất bản.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCourse} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mã học phần *</label>
                <input
                  type="text"
                  required
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  className="w-full h-9 px-3 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Tên học phần *</label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mô tả học phần</label>
              <textarea
                rows={3}
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Giảng viên phụ trách</label>
                <select
                  value={courseForm.teacher}
                  onChange={(e) => setCourseForm({ ...courseForm, teacher: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white"
                >
                  {teachersList.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.fullName} ({t.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Chuyên ngành</label>
                <select
                  value={courseForm.category}
                  onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white"
                >
                  <option value="">-- Chưa phân loại --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Trạng thái</label>
                <select
                  value={courseForm.status}
                  onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white"
                >
                  <option value="published">Công khai (published)</option>
                  <option value="draft">Bản nháp (draft)</option>
                  <option value="archived">Lưu trữ (archived)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sĩ số tối đa</label>
                <input
                  type="number"
                  value={courseForm.maxStudents}
                  onChange={(e) => setCourseForm({ ...courseForm, maxStudents: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Khóa ghi danh (tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Để trống nếu mở"
                  value={courseForm.enrollmentKey}
                  onChange={(e) => setCourseForm({ ...courseForm, enrollmentKey: e.target.value })}
                  className="w-full h-9 px-3 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setCourseModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                Lưu thay đổi học phần
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL DANH MỤC ==================== */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục Mới'}</DialogTitle>
            <DialogDescription>Quản lý phân nhóm chuyên ngành đào tạo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tên danh mục *</label>
              <input
                type="text"
                required
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mô tả</label>
              <input
                type="text"
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Màu nhận diện 3D</label>
              <input
                type="color"
                value={catForm.color}
                onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                className="h-9 w-20 border border-slate-300 rounded-md"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCatModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                Lưu danh mục
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
