import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Calendar, Users, TrendingUp, Heart, Shield, Zap, ArrowRight, CheckCircle } from 'lucide-react';

function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const features = [
    {
      icon: Calendar,
      title: 'Smart Leave Management',
      description: 'Fair leave management powered by intelligent queuing and real-time availability tracking.',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Keep your team connected with transparent workload monitoring and communication tools.',
    },
    {
      icon: TrendingUp,
      title: 'Analytics & Insights',
      description: 'Data-driven insights to help managers make informed decisions about team health.',
    },
    {
      icon: Heart,
      title: 'Wellness Focus',
      description: 'Built-in wellness days and burnout prevention to keep your team healthy and productive.',
    },
    {
      icon: Shield,
      title: 'Compliance & Security',
      description: 'Built-in bias detection, audit logs, and compliance tracking for peace of mind.',
    },
    {
      icon: Zap,
      title: 'Instant Updates',
      description: 'Real-time notifications and updates keep everyone in sync across the organization.',
    },
  ];

  const benefits = [
    'Reduce administrative overhead by 60%',
    'Improve employee satisfaction scores',
    'Ensure fair and transparent leave policies',
    'Prevent team burnout with workload monitoring',
    'Stay compliant with labor regulations',
    'Make data-driven HR decisions',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--orange)' }}>
              <span className="text-white font-bold text-xl">H</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Happen</span>
          </div>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/login')}
            className="px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            style={{ background: 'var(--orange)' }}
          >
            {user ? 'Go to Dashboard' : 'Sign In'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight" style={{ color: 'var(--text-primary)' }}>
                The Human-Centered
                <span className="block" style={{ color: 'var(--orange)' }}>Workplace OS</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Happen transforms how organizations manage people, time, and wellbeing. 
                Built for modern teams that value fairness, transparency, and employee happiness.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="px-8 py-4 rounded-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                  style={{ background: 'var(--orange)' }}
                >
                  Get Started
                  <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-4 rounded-lg font-semibold border-2 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                  style={{ borderColor: 'var(--orange)', color: 'var(--orange)' }}
                >
                  Learn More
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 100%)' }}>
                <div className="p-8 text-white">
                  <div className="space-y-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Calendar className="text-white" size={24} />
                        <span className="font-semibold text-lg">Leave Request</span>
                      </div>
                      <p className="text-white/80">3 days approved instantly</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="text-white" size={24} />
                        <span className="font-semibold text-lg">Team Status</span>
                      </div>
                      <p className="text-white/80">All members available</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Heart className="text-white" size={24} />
                        <span className="font-semibold text-lg">Wellness Score</span>
                      </div>
                      <p className="text-white/80">Team health: Excellent</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6" style={{ background: 'var(--page-bg)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Everything you need to run a human-centered workplace
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to make work better for everyone
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ background: 'var(--orange-pale)' }}>
                  <feature.icon size={28} style={{ color: 'var(--orange)' }} />
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                Why teams choose Happen
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Join hundreds of organizations that have transformed their workplace culture with Happen.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle size={24} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    <span className="text-lg text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-8 shadow-xl" style={{ background: 'linear-gradient(135deg, var(--orange-pale) 0%, white 100%)' }}>
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-4xl font-bold mb-2" style={{ color: 'var(--orange)' }}>60%</div>
                  <p className="text-gray-600">Reduction in admin time</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-4xl font-bold mb-2" style={{ color: 'var(--orange)' }}>95%</div>
                  <p className="text-gray-600">Employee satisfaction rate</p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="text-4xl font-bold mb-2" style={{ color: 'var(--orange)' }}>100%</div>
                  <p className="text-gray-600">Compliance guaranteed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6" style={{ background: 'linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 100%)' }}>
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Ready to transform your workplace?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start your journey to a more human-centered workplace today.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 rounded-lg font-semibold bg-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 inline-flex items-center gap-2"
            style={{ color: 'var(--orange)' }}
          >
            Try Happen Now
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--orange)' }}>
              <span className="text-white font-bold text-xl">H</span>
            </div>
            <span className="text-2xl font-bold">Happen</span>
          </div>
          <p className="text-gray-400 mb-4">The Human-Centered Workplace OS</p>
          <p className="text-gray-500 text-sm">© 2026 Happen. A product of emergent.sh</p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
