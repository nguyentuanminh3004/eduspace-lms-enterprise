import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  MessageSquare,
  Plus,
  Radio,
  Send,
  ShieldAlert,
  Users,
  Video,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../lib/utils';
import { Button } from '../../components/ui/button';

export default function CourseWorkspacePage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [tab, setTab] = useState('lessons');

  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentSubmissions, setSelectedAssignmentSubmissions] = useState([]);
  const [viewingAssignmentId, setViewingAssignmentId] = useState(null);

  const [quizzes, setQuizzes] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [discussions, setDiscussions] = useState([]);

  // Lesson Creation Form
  const [lessonForm, setLessonForm] = useState({ title: '', content: '', durationMinutes: 40 });

  // Anti-Cheating Quiz State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [violations, setViolations] = useState([]);
  const [proctoringAlerts, setProctoringAlerts] = useState([]);

  // Jitsi Meet + Socket Live Classroom State
  const [activeRoom, setActiveRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [roomMessages, setRoomMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const socketRef = useRef(null);

  // Discussion Form
  const [discTitle, setDiscTitle] = useState('');
  const [discContent, setDiscContent] = useState('');

  const isInstructor =
    user && (user.role === 'admin' || String(course?.teacher?._id) === String(user._id));

  const fetchAll = async () => {
    const cRes = await api.get(`/courses/${id}`);
    setCourse(cRes.data);

    try {
      const myEn = await api.get('/enrollments/my');
      const found = myEn.data.find((e) => String(e.course?._id) === String(id));
      if (found) {
        setEnrolled(true);
        setCompletedLessons(found.completedLessons || []);
      }
    } catch {}

    const [aRes, qRes, lRes, dRes] = await Promise.all([
      api.get(`/courses/${id}/assignments`),
      api.get(`/courses/${id}/quizzes`),
      api.get(`/courses/${id}/live`),
      api.get(`/courses/${id}/discussions`),
    ]);
    setAssignments(aRes.data);
    setQuizzes(qRes.data);
    setLiveSessions(lRes.data);
    setDiscussions(dRes.data);
  };

  useEffect(() => {
    fetchAll();
    const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, ''), { auth: { token: localStorage.getItem('eduspace_token') } });
    socketRef.current = socket;

    socket.on(`proctoring-course-${id}`, (alertData) => {
      setProctoringAlerts((prev) => [alertData, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // ==================== ANTI-CHEATING TAB SWITCH & WINDOW BLUR DETECTOR ====================
  useEffect(() => {
    if (!activeQuiz || quizResult || isInstructor) return;

    const handleViolation = (reason) => {
      setTabSwitchCount((prev) => {
        const nextCount = prev + 1;
        const logEntry = { type: reason, timestamp: new Date().toISOString() };
        setViolations((v) => [...v, logEntry]);

        if (socketRef.current) {
          socketRef.current.emit('proctoring-alert', {
            courseId: id,
            quizTitle: activeQuiz.title,
            student: { fullName: user.fullName, studentCode: user.studentCode },
            violationType: reason,
            count: nextCount,
          });
        }

        if (nextCount >= (activeQuiz.maxViolationsAllowed || 3)) {
          submitQuizToServer(true, nextCount, [...violations, logEntry]);
        }
        return nextCount;
      });
    };

    const onVisibilityChange = () => {
      if (document.hidden) handleViolation('Chuyển sang tab/ứng dụng khA�c khi đang lA�m bA�i');
    };
    const onWindowBlur = () => {
      handleViolation('Rời khỏi cửa sổ trA�nh duyệt thi');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [activeQuiz, quizResult, violations]);

  const submitQuizToServer = async (autoSubmitted = false, countOverride = tabSwitchCount, logsOverride = violations) => {
    if (!activeQuiz) return;
    const answersArray = activeQuiz.questions.map((_, idx) =>
      quizAnswers[idx] !== undefined ? quizAnswers[idx] : -1
    );
    const { data } = await api.post(`/quizzes/${activeQuiz._id}/submit`, {
      answers: answersArray,
      tabSwitchCount: countOverride,
      violations: logsOverride,
      autoSubmittedDueToCheating: autoSubmitted,
    });
    setQuizResult(data);
    fetchAll();
  };

  // ==================== JITSI MEET LIVE ROOM + AUTO ATTENDANCE ====================
  const joinLiveRoom = async (session) => {
    setActiveRoom(session);
    setRoomMessages([]);

    await api.post(`/live/${session._id}/attendance`).catch(() => {});

    socketRef.current.emit('join-room', {
      roomCode: session.roomCode,
      user: { _id: user._id, fullName: user.fullName, role: user.role },
    });

    socketRef.current.off('room-participants');
    socketRef.current.off('room-message');
    socketRef.current.on('room-participants', (list) => setParticipants(list));
    socketRef.current.on('room-message', (msg) => setRoomMessages((prev) => [...prev, msg]));
  };

  const sendRoomMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit('send-room-message', {
      roomCode: activeRoom.roomCode,
      user: { _id: user._id, fullName: user.fullName, role: user.role },
      text: chatInput,
    });
    setChatInput('');
  };

  const handleEnroll = async () => {
    try {
      await api.post(`/courses/${id}/enroll`);
      setEnrolled(true);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi ghi danh.');
    }
  };

  const handleCompleteLesson = async (lessonId) => {
    const { data } = await api.put(`/enrollments/${id}/lessons/${lessonId}/complete`);
    setCompletedLessons(data.completedLessons);
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    await api.post(`/courses/${id}/lessons`, lessonForm);
    setLessonForm({ title: '', content: '', durationMinutes: 40 });
    fetchAll();
  };

  const viewSubmissions = async (assignmentId) => {
    setViewingAssignmentId(assignmentId);
    const { data } = await api.get(`/assignments/${assignmentId}/submissions`);
    setSelectedAssignmentSubmissions(data);
  };

  const handleStartNewLive = async () => {
    const title = prompt('Nhập chủ đề buổi học trực tuyến Jitsi Meet:');
    if (!title) return;
    await api.post('/live', { course: id, title });
    fetchAll();
  };

  const handlePostDiscussion = async (e) => {
    e.preventDefault();
    if (!discTitle.trim() || !discContent.trim()) return;
    await api.post('/discussions', { course: id, title: discTitle, content: discContent });
    setDiscTitle('');
    setDiscContent('');
    fetchAll();
  };

  if (!course) return <div className="p-8 text-center text-sm text-slate-500">Đang tải khA�ng gian học phần...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Course Header */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-900 text-white">
              {course.code}
            </span>
            <span className="text-xs font-medium text-blue-700">{course.category?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
          <p className="text-sm text-slate-600 max-w-3xl">{course.description}</p>
          <div className="text-xs text-slate-500 pt-1">
            Giảng viA�n phụ trA�ch: <strong className="text-slate-800">{course.teacher?.fullName}</strong>
          </div>
        </div>

        {!enrolled && !isInstructor && (
          <Button variant="primary" size="lg" onClick={handleEnroll}>
            Ghi danh vA�o Học phần
          </Button>
        )}
      </div>

      {/* Real-time Proctoring Alert Banner cho Giảng viA�n */}
      {isInstructor && proctoringAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-red-800 uppercase">
            <ShieldAlert className="w-4 h-4" /> Cảnh bA�o GiA�m sA�t Thi cử Thời gian thực
          </div>
          {proctoringAlerts.slice(0, 3).map((al, i) => (
            <div key={i} className="text-xs text-red-700">
              • <strong>{al.student?.fullName}</strong> ({al.student?.studentCode}) — {al.violationType} (Lần {al.count}) trong bA�i <em>{al.quizTitle}</em>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'lessons', label: 'BA�i giảng & TA�i liệu', icon: BookOpen },
          { id: 'live', label: 'PhA�ng học Jitsi Live', icon: Video },
          { id: 'assignments', label: 'BA�i tập & QuA�t trA�ng lặp', icon: ClipboardList },
          { id: 'quizzes', label: 'Thi GiA�m sA�t (Anti-Cheat)', icon: FileQuestion },
          { id: 'discussions', label: 'Thảo luận Lớp học', icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                tab === item.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LESSONS */}
      {tab === 'lessons' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            {course.lessons?.map((lesson, idx) => {
              const isDone = completedLessons.some((lid) => String(lid) === String(lesson._id));
              return (
                <div key={lesson._id} className="p-5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono text-slate-400">
                        Chương {idx + 1} • {lesson.durationMinutes} phA�t
                      </span>
                      <h3 className="font-semibold text-base text-slate-900">{lesson.title}</h3>
                    </div>
                    {enrolled && (
                      <Button
                        variant={isDone ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleCompleteLesson(lesson._id)}
                      >
                        <CheckCircle2 className={`w-4 h-4 mr-1.5 ${isDone ? 'text-emerald-600' : ''}`} />
                        {isDone ? 'ĐA� hoA�n thA�nh' : 'ĐA�nh dấu hoA�n thA�nh'}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{lesson.content}</p>
                </div>
              );
            })}
          </div>

          {isInstructor && (
            <div className="lg:col-span-4">
              <form onSubmit={handleAddLesson} className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
                <h3 className="font-semibold text-sm text-slate-900">ThA�m Chương / BA�i giảng mới</h3>
                <input
                  type="text"
                  required
                  placeholder="TiA�u đề bA�i giảng"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
                />
                <textarea
                  rows={4}
                  required
                  placeholder="Nội dung chi tiết bA�i giảng..."
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-md"
                />
                <Button type="submit" variant="primary" size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> Đăng bA�i giảng
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: JITSI MEET LIVE CLASSROOM */}
      {tab === 'live' && (
        <div className="space-y-4">
          {isInstructor && (
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={handleStartNewLive}>
                <Radio className="w-4 h-4 mr-1.5" /> Khởi tạo PhA�ng học Jitsi Meet
              </Button>
            </div>
          )}

          {!activeRoom ? (
            <div className="grid md:grid-cols-2 gap-4">
              {liveSessions.map((s) => (
                <div key={s._id} className="p-5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        {s.status}
                      </span>
                      <span className="font-mono text-xs text-slate-500">{s.roomCode}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mt-1">{s.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Chủ trA�: {s.host?.fullName} • Điểm danh: {s.attendees?.length || 0} học viA�n
                    </p>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => joinLiveRoom(s)}>
                    VA�o phA�ng Jitsi
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid lg:grid-cols-12 gap-4 bg-white border border-slate-200 rounded-xl p-4">
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-blue-700">PHA�NG JITSI: {activeRoom.roomCode}</span>
                    <h3 className="text-base font-bold text-slate-900">{activeRoom.title}</h3>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setActiveRoom(null)}>
                    Rời phA�ng học
                  </Button>
                </div>

                {/* Jitsi Meet WebRTC Embed */}
                <div className="w-full h-[440px] rounded-lg overflow-hidden border border-slate-300 bg-slate-950">
                  <iframe
                    title="Jitsi Meet Virtual Classroom"
                    src={`https://meet.jit.si/${activeRoom.jitsiRoomName}#userInfo.displayName="${encodeURIComponent(
                      user.fullName
                    )}"&config.prejoinPageEnabled=false`}
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col border border-slate-200 rounded-lg h-[495px]">
                <div className="p-3 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Thảo luận lớp & Điểm danh</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Users className="w-3.5 h-3.5" /> {participants.length}
                  </span>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
                  {roomMessages.map((m, i) =>
                    m.system ? (
                      <div key={i} className="text-center text-slate-400 italic py-1">
                        {m.text}
                      </div>
                    ) : (
                      <div key={i} className="p-2 rounded bg-slate-50">
                        <span className="font-semibold text-slate-900">{m.sender?.fullName}: </span>
                        <span className="text-slate-700">{m.text}</span>
                      </div>
                    )
                  )}
                </div>
                <form onSubmit={sendRoomMessage} className="p-2 border-t border-slate-200 flex gap-1.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Trao đổi trong lớp..."
                    className="flex-1 h-8 px-2.5 text-xs border border-slate-300 rounded"
                  />
                  <Button type="submit" size="sm">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ASSIGNMENTS + PLAGIARISM SIMILARITY CHECK */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {assignments.map((a) => (
            <div key={a._id} className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{a.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{a.description}</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded bg-amber-50 text-amber-800">
                  Hạn nộp: {formatDateTime(a.dueDate)}
                </span>
              </div>

              {!isInstructor ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const text = e.target.elements.submissionText.value;
                    const { data } = await api.post(`/assignments/${a._id}/submit`, { content: text });
                    alert(`ĐA� nộp bA�i thA�nh cA�ng! Tỷ lệ trA�ng lặp học thuật: ${data.similarityScore}%`);
                    e.target.reset();
                  }}
                  className="space-y-2 pt-2"
                >
                  <textarea
                    name="submissionText"
                    rows={3}
                    required
                    placeholder="Nhập nội dung bA�i lA�m hoặc bA�o cA�o thực hA�nh (Hệ thống tự động quA�t tỷ lệ trA�ng lặp)..."
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-md"
                  />
                  <Button type="submit" variant="primary" size="sm">
                    Nộp bA�i tập
                  </Button>
                </form>
              ) : (
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => viewSubmissions(a._id)}>
                    Xem danh sA�ch bA�i nộp & Kết quả quA�t trA�ng lặp
                  </Button>

                  {viewingAssignmentId === a._id && (
                    <div className="mt-3 border border-slate-200 rounded-lg divide-y divide-slate-100">
                      {selectedAssignmentSubmissions.length === 0 ? (
                        <div className="p-4 text-xs text-slate-500">Chưa cA� sinh viA�n nA�o nộp bA�i.</div>
                      ) : (
                        selectedAssignmentSubmissions.map((sub) => (
                          <div key={sub._id} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold text-slate-900">{sub.student?.fullName}</span> (
                              {sub.student?.studentCode})
                              <p className="text-slate-600 mt-1 line-clamp-2">{sub.content}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded font-semibold ${
                                  sub.similarityScore >= 60
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                TrA�ng lặp: {sub.similarityScore}%
                              </span>
                              {sub.score !== null && sub.score !== undefined && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold">
                                  Điểm: {sub.score}/10
                                </span>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const sc = window.prompt(`Nhập điểm (0-10) cho ${sub.student?.fullName}:`, sub.score ?? 8);
                                  if (sc === null) return;
                                  const fb = window.prompt('Nhận xA�t của giảng viA�n:', sub.feedback || 'HoA�n thA�nh tốt.');
                                  await api.put(`/submissions/${sub._id}/grade`, { score: Number(sc), feedback: fb || '' });
                                  viewSubmissions(a._id);
                                }}
                              >
                                Chấm điểm
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: ANTI-CHEATING PROCTORED QUIZZES */}
      {tab === 'quizzes' && (
        <div className="space-y-4">
          {!activeQuiz ? (
            <div className="grid md:grid-cols-2 gap-4">
              {quizzes.map((q) => (
                <div key={q._id} className="p-5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700">
                        GiA�m sA�t chống chuyển tab
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mt-1">{q.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {q.questions?.length} cA�u hỏi • Thời gian: {q.durationMinutes} phA�t • Tối đa {q.maxViolationsAllowed} lần cảnh bA�o
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setActiveQuiz(q);
                      setQuizAnswers({});
                      setQuizResult(null);
                      setTabSwitchCount(0);
                      setViolations([]);
                    }}
                  >
                    Bắt đầu thi
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div
              onCopy={(e) => e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              className="p-6 rounded-xl bg-white border border-slate-200 space-y-6 select-none"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{activeQuiz.title}</h3>
                  <div className="text-xs text-amber-700 flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Chế độ giA�m sA�t đang bật: KhA�ng chuyển tab hoặc rời khỏi cửa sổ trA�nh duyệt (Vi phạm: {tabSwitchCount}/
                    {activeQuiz.maxViolationsAllowed || 3})
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveQuiz(null)}>
                  ThoA�t
                </Button>
              </div>

              {quizResult ? (
                <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-2">
                  <div className="text-sm font-medium text-slate-600">Kết quả BA�i kiểm tra GiA�m sA�t</div>
                  <div className="text-3xl font-bold text-slate-900">{quizResult.score} / 10 điểm</div>
                  <div className="text-xs text-slate-600">
                    ĐA�ng {quizResult.rawCorrect}/{quizResult.totalQuestions} cA�u • Số lần vi phạm rời mA�n hA�nh: {quizResult.tabSwitchCount}
                  </div>
                  {quizResult.autoSubmittedDueToCheating && (
                    <div className="text-xs font-semibold text-red-700">
                      Hệ thống đA� tự động thu bA�i do vượt quA� số lần vi phạm quy chế thi!
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {activeQuiz.questions.map((q, qIdx) => (
                    <div key={qIdx} className="space-y-2">
                      <div className="font-medium text-sm text-slate-900">
                        CA�u {qIdx + 1}: {q.questionText}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <label
                            key={oIdx}
                            className={`p-3 rounded-lg border text-sm cursor-pointer flex items-center gap-2 ${
                              quizAnswers[qIdx] === oIdx
                                ? 'border-blue-700 bg-blue-50 text-blue-900 font-medium'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q-${qIdx}`}
                              checked={quizAnswers[qIdx] === oIdx}
                              onChange={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button variant="primary" onClick={() => submitQuizToServer(false)}>
                    Nộp bA�i kiểm tra
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DISCUSSIONS */}
      {tab === 'discussions' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            {discussions.map((d) => (
              <div key={d._id} className="p-5 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{d.author?.fullName}</span>
                  <span>{formatDateTime(d.createdAt)}</span>
                </div>
                <h4 className="font-semibold text-slate-900">{d.title}</h4>
                <p className="text-sm text-slate-600">{d.content}</p>
                {d.replies?.length > 0 && (
                  <div className="mt-3 pl-4 border-l-2 border-slate-200 space-y-2">
                    {d.replies.map((r, rIdx) => (
                      <div key={r._id || rIdx} className="text-xs bg-slate-50 p-2 rounded">
                        <span className="font-semibold text-slate-800">{r.author?.fullName}: </span>
                        <span className="text-slate-600">{r.content}</span>
                      </div>
                    ))}
                  </div>
                )}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const val = e.target.elements.replyText.value;
                    if (!val.trim()) return;
                    await api.post(`/discussions/${d._id}/replies`, { content: val });
                    e.target.reset();
                    fetchAll();
                  }}
                  className="pt-2 flex gap-2"
                >
                  <input
                    name="replyText"
                    type="text"
                    placeholder="Viết phản hồi thảo luận..."
                    className="flex-1 h-8 px-2.5 text-xs border border-slate-300 rounded-md"
                  />
                  <Button type="submit" variant="outline" size="sm">
                    Trả lời
                  </Button>
                </form>
              </div>
            ))}
          </div>
          <div className="lg:col-span-4">
            <form onSubmit={handlePostDiscussion} className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
              <h3 className="font-semibold text-sm text-slate-900">Tạo chủ đề thảo luận</h3>
              <input
                type="text"
                required
                placeholder="TiA�u đề cA�u hỏi"
                value={discTitle}
                onChange={(e) => setDiscTitle(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-slate-300 rounded-md"
              />
              <textarea
                rows={4}
                required
                placeholder="Nội dung thảo luận..."
                value={discContent}
                onChange={(e) => setDiscContent(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-md"
              />
              <Button type="submit" variant="primary" size="sm" className="w-full">
                Đăng thảo luận
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

