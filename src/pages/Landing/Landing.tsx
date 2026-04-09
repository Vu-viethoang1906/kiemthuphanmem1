import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGetStarted = () => {
    const isAdmin = location.pathname.startsWith('/admin');
    const projectsPath = isAdmin ? '/admin/projects?action=clone-template' : '/dashboard/projects?action=clone-template';
    navigate(projectsPath);
  };

  const handleLearnMore = () => {
    const isAdmin = location.pathname.startsWith('/admin');
    navigate(isAdmin ? '/admin' : '/dashboard');
  };

  return (
    <div className="fixed inset-0 w-full h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Top Banner */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
            <span className="text-gray-700 text-sm">Announcing our next round of funding.</span>
            <a href="#" className="text-indigo-600 font-semibold text-sm hover:text-indigo-700 flex items-center gap-1">
              Read more
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
          Data to enrich your<br />online business
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Anim aute id magna aliqua ad ad non deserunt sunt. Qui irure qui lorem cupidatat commodo. Elit sunt amet fugiat veniam occaecat.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Get started
          </button>
          <button
            onClick={handleLearnMore}
            className="px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-700 font-semibold rounded-lg hover:bg-white transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            Learn more
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Landing;
