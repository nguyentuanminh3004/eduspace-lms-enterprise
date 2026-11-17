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

  // Modal: C?p ph�t / Ch?nh s?a User
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    role: 'student',
    department: 'Khoa C�ng Ngh? Th�ng Tin',
    studentCode: '',
    phone: '',
    bio: '',
    isActive: true,
    mustChangePassword: true,
    newPassword: '',
  });

  // Modal: Nh?p CSV h�ng lo?t
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);

  // Modal: Ch?nh s?a H?c ph?n cho Admin
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    code: '',
    description: '',
    category: '',
    teacher: '',
    level: 'Co b?n',
    status: 'published',
    isFeatured: false,
    maxStudents: 100,
    enrollmentKey: '',
  });

  // Modal: Danh m?c
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
      department: 'Khoa C�ng Ngh? Th�ng Tin',
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
        showNotice(`�� c?p nh?t h? so t�i kho?n ${userForm.fullName}.`);
      } else {
        await api.post('/admin/users', {
          ...userForm,
          password: userForm.newPassword,
        });
        showNotice(`�� c?p ph�t t�i kho?n m?i cho ${userForm.fullName}.`);
      }
      setUserModalOpen(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'L?i luu d? li?u ngu?i d�ng.');
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
      alert(err.response?.data?.message || 'L?i x? l� t?p CSV.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`X�c nh?n x�a vinh vi?n t�i kho?n ${user.fullName} (${user.email})?`)) return;
    try {
      await api.delete(`/admin/users/${user._id}`);
      showNotice(`�� x�a t�i kho?n ${user.email}.`);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Kh�ng th? x�a t�i kho?n.');
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
      level: course.level || 'Co b?n',
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
      showNotice(`�� c?p nh?t th�ng tin h?c ph?n [${courseForm.code}] ${courseForm.title}.`);
      setCourseModalOpen(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'L?i c?p nh?t h?c ph?n.');
    }
  };

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`X�a h?c ph?n [${course.code}] ${course.title}?`)) return;
    try {
      await api.delete(`/admin/courses/${course._id}`);
      showNotice(`�� x�a h?c ph?n ${course.code}.`);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'L?i x�a h?c ph?n.');
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
        showNotice('�� c?p nh?t danh m?c chuy�n ng�nh.');
      } else {
        await api.post('/admin/categories', catForm);
        showNotice('�� t?o danh m?c m?i.');
      }
      setCatModalOpen(false);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'L?i luu danh m?c.');
    }
  };

  const userColumns = useMemo(
    () => [
      {
        accessorKey: 'fullName',
        header: 'H?c vi�n / C�n b?',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900">{row.original.fullName}</div>
            <div className="text-xs text-slate-500">{row.original.email}</div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Vai tr�',
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
        header: 'Khoa / M� d?nh danh',
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="text-slate-700">{row.original.department || '�'}</div>
            {row.original.studentCode && <div className="font-mono text-slate-500">{row.original.studentCode}</div>}
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Tr?ng th�i',
        cell: ({ row }) =>
          row.original.isActive ? (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              �ang ho?t d?ng
            </span>
          ) : (
            <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
              ��nh ch?
            </span>
          ),
      },
      {
        id: 'actions',
        header: 'Qu?n tr?',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => openEditUser(row.original)}>
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Ch?nh s?a
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
        header: 'M� HP',
        cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.code}</span>,
      },
      {
        accessorKey: 'title',
        header: 'T�n h?c ph?n',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900">{row.original.title}</div>
            <div className="text-xs text-slate-500">
              GV: {row.original.teacher?.fullName || 'Chua ph�n c�ng'} � {row.original.category?.name || 'Chua ph�n lo?i'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Tr?ng th�i',
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
        header: 'Si s? t?i da',
        cell: ({ row }) => <span className="text-xs font-mono">{row.original.maxStudents}</span>,
      },
      {
        id: 'actions',
        header: 'Qu?n tr?',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => openEditCourse(row.original)}>
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Ch?nh s?a
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
          <h1 className="text-2xl font-bold text-slate-900">Qu?n tr? ��o t?o & B?o m?t T?p trung</h1>
          <p className="text-sm text-slate-600 mt-1">
            C?p ph�t t�i kho?n, nh?p danh s�ch CSV, ch?nh s?a h? so ngu?i d�ng, di?u ph?i h?c ph?n v� gi�m s�t nh?t k� h? th?ng.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={openCreateUser}>
            <UserPlus className="w-4 h-4 mr-1.5" /> C?p t�i kho?n m?i
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCsvResult(null);
              setCsvModalOpen(true);
            }}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Nh?p h�ng lo?t CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => openCategoryModal(null)}>
            <Plus className="w-4 h-4 mr-1.5" /> Th�m danh m?c
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
              <span>T�i kho?n du?c c?p</span>
              <Users className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.totalUsers}</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.totalTeachers} GV � {stats.totalStudents} HV � {stats.lockedUsers} kh�a
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>H?c ph?n d�o t?o</span>
              <BookOpen className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.totalCourses}</div>
            <div className="text-xs text-slate-500 mt-1">{stats.publishedCourses} dang m? l?p</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Lu?t ghi danh l?p h?c</span>
              <UserCheck className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.totalEnrollments}</div>
            <div className="text-xs text-slate-500 mt-1">{stats.totalQuizzes} b�i thi gi�m s�t</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Ph�ng h?c Jitsi Live</span>
              <ShieldAlert className="w-4 h-4 text-purple-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{stats.activeLiveSessions}</div>
            <div className="text-xs text-slate-500 mt-1">Phi�n tr?c tuy?n ho?t d?ng</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'users', label: 'Qu?n l� Ngu?i d�ng (C?p ph�t & S?a)', icon: Users },
          { id: 'courses', label: 'Qu?n l� H?c ph?n (S?a & �i?u ph?i)', icon: BookOpen },
          { id: 'categories', label: 'Danh m?c Chuy�n ng�nh', icon: FolderKanban },
          { id: 'logs', label: 'Nh?t k� Ki?m to�n & C?nh b�o Vi ph?m', icon: History },
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
        <DataTable columns={userColumns} data={users} searchPlaceholder="T�m theo h? t�n, email, m� d?nh danh..." />
      )}

      {activeTab === 'courses' && (
        <DataTable columns={courseColumns} data={courses} searchPlaceholder="T�m theo m� h?c ph?n, t�n m�n..." />
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
                <p className="text-xs text-slate-500">{cat.description || 'Kh�ng c� m� t?'}</p>
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
                {log.actor?.fullName} � {formatDateTime(log.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== MODAL C?P PH�T & CH?NH S?A NGU?I D�NG ==================== */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? `Ch?nh s?a H? so: ${editingUser.fullName}` : 'C?p ph�t T�i kho?n M?i'}
            </DialogTitle>
            <DialogDescription>
              Thi?t l?p th�ng tin d?nh danh, ph�n quy?n RBAC, tr?ng th�i kh�a/m? v� m?t kh?u truy c?p.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">H? v� t�n *</label>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email d?nh danh *</label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Vai tr� RBAC</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white"
                >
                  <option value="student">H?c vi�n (student)</option>
                  <option value="teacher">Gi?ng vi�n (teacher)</option>
                  <option value="admin">Qu?n tr? (admin)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">M� SV / C�n b?</label>
                <input
                  type="text"
                  value={userForm.studentCode}
                  onChange={(e) => setUserForm({ ...userForm, studentCode: e.target.value })}
                  className="w-full h-9 px-3 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">S? di?n tho?i</label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Khoa / �on v?</label>
                <input
                  type="text"
                  value={userForm.department}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {editingUser ? '�?t l?i m?t kh?u m?i (b? tr?ng n?u gi? nguy�n)' : 'M?t kh?u kh?i t?o *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  placeholder="T?i thi?u 6 k� t?"
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
                T�i kho?n dang k�ch ho?t (B? ch?n d? d�nh ch? truy c?p ngay l?p t?c)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={userForm.mustChangePassword}
                  onChange={(e) => setUserForm({ ...userForm, mustChangePassword: e.target.checked })}
                />
                Y�u c?u ngu?i d�ng d?i m?t kh?u ? l?n dang nh?p k? ti?p
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)}>
                H?y
              </Button>
              <Button type="submit" variant="primary">
                Luu th�ng tin t�i kho?n
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL NH?P CSV H�NG LO?T ==================== */}
      <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nh?p danh s�ch Ngu?i d�ng h�ng lo?t (CSV)</DialogTitle>
            <DialogDescription>
              T?p CSV c?n c� c�c c?t ti�u d?: <code className="font-mono text-xs">fullName,email,password,role,studentCode,department</code>
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
                  <div key={i} className="text-red-600">� {err}</div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCsvModalOpen(false)}>
                ��ng
              </Button>
              <Button type="submit" variant="primary">
                T?i l�n & C?p ph�t
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL CH?NH S?A H?C PH?N CHO ADMIN ==================== */}
      <Dialog open={courseModalOpen} onOpenChange={setCourseModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ch?nh s?a H?c ph?n: {editingCourse?.code}</DialogTitle>
            <DialogDescription>
              �i?u ch?nh th�ng tin m�n h?c, ph�n c�ng gi?ng vi�n ph? tr�ch, m� ghi danh l?p v� tr?ng th�i xu?t b?n.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCourse} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">M� h?c ph?n *</label>
                <input
                  type="text"
                  required
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  className="w-full h-9 px-3 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">T�n h?c ph?n *</label>
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
              <label className="block text-xs font-medium text-slate-700 mb-1">M� t? h?c ph?n</label>
              <textarea
                rows={3}
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Gi?ng vi�n ph? tr�ch</label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Chuy�n ng�nh</label>
                <select
                  value={courseForm.category}
                  onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white"
                >
                  <option value="">-- Chua ph�n lo?i --</option>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Tr?ng th�i</label>
                <select
                  value={courseForm.status}
                  onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md bg-white"
                >
                  <option value="published">C�ng khai (published)</option>
                  <option value="draft">B?n nh�p (draft)</option>
                  <option value="archived">Luu tr? (archived)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Si s? t?i da</label>
                <input
                  type="number"
                  value={courseForm.maxStudents}
                  onChange={(e) => setCourseForm({ ...courseForm, maxStudents: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kh�a ghi danh (t�y ch?n)</label>
                <input
                  type="text"
                  placeholder="�? tr?ng n?u m?"
                  value={courseForm.enrollmentKey}
                  onChange={(e) => setCourseForm({ ...courseForm, enrollmentKey: e.target.value })}
                  className="w-full h-9 px-3 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setCourseModalOpen(false)}>
                H?y
              </Button>
              <Button type="submit" variant="primary">
                Luu thay d?i h?c ph?n
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL DANH M?C ==================== */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Ch?nh s?a Danh m?c' : 'Th�m Danh m?c M?i'}</DialogTitle>
            <DialogDescription>Qu?n l� ph�n nh�m chuy�n ng�nh d�o t?o.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">T�n danh m?c *</label>
              <input
                type="text"
                required
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">M� t?</label>
              <input
                type="text"
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">M�u nh?n di?n 3D</label>
              <input
                type="color"
                value={catForm.color}
                onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                className="h-9 w-20 border border-slate-300 rounded-md"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCatModalOpen(false)}>
                H?y
              </Button>
              <Button type="submit" variant="primary">
                Luu danh m?c
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
