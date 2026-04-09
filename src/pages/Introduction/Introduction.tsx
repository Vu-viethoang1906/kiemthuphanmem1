import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: 'Quản lý công việc',
    desc: 'Tạo, phân công và theo dõi tiến độ các task theo dạng bảng Kanban trực quan, dễ dàng kéo-thả.',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Làm việc nhóm',
    desc: 'Mời thành viên, phân quyền linh hoạt, trao đổi bình luận và chia sẻ tiến độ theo thời gian thực.',
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Phân tích & Báo cáo',
    desc: 'Theo dõi hiệu suất nhóm, biểu đồ throughput, cycle time và báo cáo tự động định kỳ.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Hỗ trợ AI',
    desc: 'Trí tuệ nhân tạo gợi ý phân công task, phát hiện rủi ro và tạo lộ trình học tập cá nhân hoá.',
    color: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
    title: 'Gamification',
    desc: 'Hệ thống điểm thưởng, huy hiệu và bảng xếp hạng giúp tăng động lực và sự gắn kết của đội nhóm.',
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Tích hợp mở rộng',
    desc: 'Kết nối với Google Calendar, Slack và nhiều công cụ khác để đồng bộ công việc tự động.',
    color: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
];

const Introduction: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    const isAdmin = location.pathname.startsWith('/admin');
    const projectsPath = isAdmin
      ? '/admin/projects?action=clone-template'
      : '/dashboard/projects?action=clone-template';
    navigate(projectsPath);
  };

  return (
    <div className="w-full min-h-screen" style={{ background: 'linear-gradient(135deg, #f8f7ff 0%, #eef2ff 40%, #f0fdf4 100%)' }}>

      {/* ===== HERO SECTION ===== */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8"
          style={{
            background: 'linear-gradient(135deg, #ede9fe, #dbeafe)',
            color: '#5b21b6',
            border: '1px solid #c4b5fd',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.5s ease',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse inline-block" />
          Nền tảng quản lý dự án thông minh
        </div>

        {/* Main Heading */}
        <h1
          className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
          style={{
            color: '#1e1b4b',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.6s ease 0.1s',
          }}
        >
          Chào mừng đến với{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            KEN
          </span>
        </h1>

        {/* Sub-heading */}
        <p
          className="text-xl lg:text-2xl font-medium mb-4"
          style={{
            color: '#4c1d95',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.6s ease 0.2s',
          }}
        >
          Quản lý dự án — Cộng tác nhóm — Phát triển bản thân
        </p>

        {/* Description */}
        <p
          className="text-lg leading-relaxed max-w-2xl mx-auto mb-10"
          style={{
            color: '#6b7280',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.6s ease 0.3s',
          }}
        >
          KEN là công cụ giúp các nhóm học tập và làm việc tổ chức công việc hiệu quả hơn.
          Từ việc giao task, theo dõi tiến độ đến phân tích hiệu suất — tất cả trong một nơi duy nhất,
          thông minh và dễ sử dụng.
        </p>

        {/* CTA Button */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.6s ease 0.4s',
          }}
        >
          <button
            id="btn-get-started"
            onClick={handleGetStarted}
            className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-bold text-lg shadow-xl hover:shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px) scale(1.02)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1)';
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Bắt đầu ngay
            <svg
              className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <p className="mt-4 text-sm" style={{ color: '#9ca3af' }}>
            Không cần cài đặt • Hoàn toàn miễn phí • Bắt đầu trong 30 giây
          </p>
        </div>
      </section>

      {/* ===== DIVIDER ===== */}
      <div className="max-w-4xl mx-auto px-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #c4b5fd)' }} />
          <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ color: '#7c3aed', background: '#ede9fe' }}>
            Tính năng nổi bật
          </span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #c4b5fd)' }} />
        </div>
      </div>

      {/* ===== FEATURES GRID ===== */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className={`rounded-2xl p-6 border ${f.bg} ${f.border} hover:shadow-lg group cursor-default`}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(32px)',
                transition: `all 0.5s ease ${0.5 + i * 0.08}s`,
              }}
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 transition-transform duration-300 group-hover:scale-110`}
                style={{ background: `linear-gradient(135deg, var(--from), var(--to))`, backgroundImage: `linear-gradient(135deg, ${f.color.replace('from-', '').split(' ')[0].replace('from-', '#')} , #fff)` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                  style={{ background: `linear-gradient(135deg, ${getColorHex(f.color).from}, ${getColorHex(f.color).to})` }}
                >
                  {f.icon}
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#1e1b4b' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section
        className="mx-6 lg:mx-auto max-w-5xl rounded-3xl p-10 mb-16"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', boxShadow: '0 20px 60px rgba(124,58,237,0.3)' }}
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-white mb-3">Bắt đầu dễ dàng chỉ trong 3 bước</h2>
          <p className="text-indigo-200 text-base">Không cần kỹ năng kỹ thuật, ai cũng có thể sử dụng ngay</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Tạo dự án', desc: 'Chọn template có sẵn hoặc tạo bảng Kanban mới theo nhu cầu của nhóm bạn.' },
            { step: '02', title: 'Mời thành viên', desc: 'Thêm thành viên vào dự án, phân quyền và bắt đầu giao việc ngay lập tức.' },
            { step: '03', title: 'Theo dõi & Hoàn thành', desc: 'Cập nhật tiến độ, nhận thông báo và xem báo cáo hiệu suất của cả nhóm.' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black mx-auto mb-4"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '2px solid rgba(255,255,255,0.4)' }}
              >
                {s.step}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
              <p className="text-indigo-200 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <button
            id="btn-get-started-bottom"
            onClick={handleGetStarted}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-base"
            style={{
              background: '#fff',
              color: '#7c3aed',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
            }}
          >
            🚀 Bắt đầu sử dụng KEN ngay
          </button>
        </div>
      </section>
    </div>
  );
};

// Helper: map tailwind gradient class names to real hex colors
function getColorHex(colorClass: string): { from: string; to: string } {
  const map: Record<string, { from: string; to: string }> = {
    'from-violet-500 to-purple-600': { from: '#8b5cf6', to: '#9333ea' },
    'from-blue-500 to-cyan-500':    { from: '#3b82f6', to: '#06b6d4' },
    'from-emerald-500 to-teal-500': { from: '#10b981', to: '#14b8a6' },
    'from-orange-500 to-amber-500': { from: '#f97316', to: '#f59e0b' },
    'from-pink-500 to-rose-500':    { from: '#ec4899', to: '#f43f5e' },
    'from-indigo-500 to-blue-600':  { from: '#6366f1', to: '#2563eb' },
  };
  return map[colorClass] || { from: '#7c3aed', to: '#2563eb' };
}

export default Introduction;
