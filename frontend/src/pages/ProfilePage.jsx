import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, CheckCircle2, History, KeyRound, ShieldAlert, User } from 'lucide-react';
import api, { getAvatarUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../lib/utils';
import { Button } from '../components/ui/button';

export default function ProfilePage() {
  const { user, updateUserState } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'info';

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [logs, setLogs] = useState([]);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'logs') {
      api
        .get('/auth/activity-logs')
        .then((res) => setLogs(res.data.logs || []))
        .catch(() => setLogs([]));
    }
  }, [activeTab]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice({ type: '', text: '' });
    try {
      const { data } = await api.put('/auth/profile', { fullName, phone, bio });
      updateUserState(data.user || { fullName, phone, bio });
      setNotice({ type: 'success', text: data.message || 'C?p nh?t h? so th�nh c�ng!' });
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'L?i c?p nh?t h? so.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    setBusy(true);
    setNotice({ type: '', text: '' });
    try {
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUserState({ avatar: data.avatar });
      setNotice({ type: 'success', text: data.message });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.response?.data?.message || 'T?p ?nh kh�ng h?p l? (h? th?ng ki?m tra ch? k� Magic Bytes th?c t?).',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setNotice({ type: 'error', text: 'M?t kh?u x�c nh?n kh�ng kh?p.' });
      return;
    }
    setBusy(true);
    setNotice({ type: '', text: '' });
    try {
      const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
      if (data.token) localStorage.setItem('eduspace_token', data.token);
      updateUserState({ mustChangePassword: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice({ type: 'success', text: data.message });
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || '�?i m?t kh?u th?t b?i.' });
    } finally {
      setBusy(false);
    }
  };

  const avatarSrc = getAvatarUrl(user?.avatar);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          {avatarSrc ? (
            <img src={avatarSrc} alt="Avatar" className="w-24 h-24 rounded-2xl object-cover border border-slate-200" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-slate-900 text-white text-3xl font-bold flex items-center justify-center">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <label className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline cursor-pointer">
            <Camera className="w-3.5 h-3.5" /> �?i ?nh d?i di?n
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>

        <div className="text-center sm:text-left flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl font-bold text-slate-900">{user?.fullName}</h1>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 uppercase">
              {user?.role}
            </span>
          </div>
          <p className="text-sm text-slate-600">{user?.email}</p>
          <p className="text-xs text-slate-500">
            �on v?: {user?.department} {user?.studentCode ? `� M� d?nh danh: ${user.studentCode}` : ''}
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'info', label: 'Th�ng tin c� nh�n', icon: User },
          { id: 'security', label: '�?i m?t kh?u & B?o m?t', icon: KeyRound },
          { id: 'logs', label: 'Nh?t k� ho?t d?ng', icon: History },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                setNotice({ type: '', text: '' });
                setSearchParams({ tab: t.id });
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {notice.text && (
        <div
          className={`p-3.5 rounded-lg text-sm font-medium border flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          {notice.text}
        </div>
      )}

      {activeTab === 'info' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">H? v� t�n *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">S? di?n tho?i li�n h?</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Gi?i thi?u chuy�n m�n / Ghi ch� h?c t?p</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 text-sm"
            />
          </div>

          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? '�ang luu...' : 'Luu th�ng tin h? so'}
          </Button>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 max-w-lg">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Ch�nh s�ch m?t kh?u m?nh: T?i thi?u 8 k� t?, bao g?m ch? hoa, ch? thu?ng, ch? s? v� k� t? d?c bi?t. Sau khi d?i m?t kh?u, m?i phi�n dang nh?p cu tr�n thi?t b? kh�c s? t? d?ng b? thu h?i.
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">M?t kh?u hi?n t?i</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">M?t kh?u m?i</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">X�c nh?n m?t kh?u m?i</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm"
            />
          </div>
          <Button type="submit" variant="primary" disabled={busy}>
            C?p nh?t m?t kh?u b?o m?t
          </Button>
        </form>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">S? ki?n b?o m?t</th>
                <th className="px-4 py-3">Chi ti?t</th>
                <th className="px-4 py-3">Th?i gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    Chua c� nh?t k� ho?t d?ng n�o.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{log.action}</td>
                    <td className="px-4 py-3 text-slate-600">{log.details}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
