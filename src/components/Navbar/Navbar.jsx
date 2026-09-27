import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Languages, LogIn, LogOut, Menu, Settings, ShieldCheck, UserRound, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import { authAPI } from '../../services/api';
import { t } from '../../i18n/translations';
import './Navbar.css';

export default function Navbar({ language, setLanguage }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, updateUser } = useAuth();
  const { setVoiceEnabled, resetDialog } = useVoice();
  const navigate = useNavigate();
  const location = useLocation();
  const L = (key) => t(key, language);
  const bn = language === 'bn';

  const toggleLanguage = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const nextLang = bn ? 'en' : 'bn';
    setLanguage(nextLang);
    if (user && updateUser) {
      updateUser({ language: nextLang });
      authAPI.updateProfile({ language: nextLang }).catch(() => {});
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 14);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Route changes close the transient mobile menu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const openMenu = () => setMobileOpen(true);
    window.addEventListener('veda-open-menu', openMenu);
    return () => window.removeEventListener('veda-open-menu', openMenu);
  }, []);

  const go = (path) => navigate(path);
  const signOut = () => {
    setVoiceEnabled(false);
    resetDialog();
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/first-aid', label: L('firstAid') },
    { path: '/body-map', label: L('bodyMap') },
    { path: '/nearby', label: bn ? 'হাসপাতাল' : 'Hospitals' },
    { path: '/teleconsultation', label: bn ? 'ডাক্তার' : 'Doctors' },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="main-navbar">
      <div className="navbar-inner">
        <button className="navbar-logo" onClick={() => go('/')} id="navbar-logo" aria-label={bn ? 'Veda হোম' : 'Veda home'}>
          <span className="navbar-logo-icon">✚</span>
          <span className="navbar-brand-copy">
            <strong className="navbar-logo-text">Veda</strong>
            <small className="navbar-logo-subtitle">Home Doctor</small>
          </span>
        </button>

        <div className={`navbar-nav ${mobileOpen ? 'mobile-open' : ''}`} id="primary-navigation">
          <button className={`nav-link mobile-home-link ${location.pathname === '/' ? 'active' : ''}`} onClick={() => go('/')}>
            {L('home')}
          </button>

          {navItems.map((item) => (
            <button
              key={item.path}
              className={`nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              onClick={() => go(item.path)}
              id={`nav-${item.path.replace('/', '')}`}
            >
              {item.label}
            </button>
          ))}

          <button className="nav-link mobile-only-link" onClick={() => go('/about')}>{L('about')}</button>

          {user?.role === 'admin' && (
            <button className="nav-link" onClick={() => go('/admin')} id="nav-admin">
              <ShieldCheck size={16} /> {L('admin')}
            </button>
          )}

          <button
            className={`nav-account ${location.pathname === '/dashboard' && !location.search.includes('settings=true') ? 'active' : ''}`}
            onClick={() => go(user ? '/dashboard' : '/login')}
            id={user ? 'nav-dashboard' : 'nav-login'}
          >
            {user ? (
              user.avatar ? (
                <img src={user.avatar} alt="" className="nav-user-avatar-mini" />
              ) : (
                <UserRound size={17} />
              )
            ) : (
              <LogIn size={17} />
            )}
            <span>{user ? (user.name || L('profile')) : L('login')}</span>
          </button>

          {user && (
            <button
              className={`nav-link nav-settings ${location.pathname === '/settings' ? 'active' : ''}`}
              onClick={() => go('/settings')}
              id="nav-settings"
              title={L('settings')}
            >
              <Settings size={17} />
              <span>{L('settings')}</span>
            </button>
          )}

          {user && (
            <button className="nav-logout" onClick={signOut} id="nav-logout" title={L('logout')} aria-label={L('logout')}>
              <LogOut size={17} /><span>{L('logout')}</span>
            </button>
          )}

          <button className="nav-cta" onClick={() => go('/symptom-checker')} id="nav-check-symptoms-cta">
            {L('checkSymptoms')}
          </button>
        </div>

        <div className="navbar-utility">
          <button
            type="button"
            className="nav-language"
            onClick={toggleLanguage}
            aria-label={bn ? 'Switch to English' : 'বাংলায় দেখুন'}
            title={bn ? 'Switch to English' : 'বাংলায় দেখুন'}
            id="language-selector"
          >
            <Languages size={18} />
          </button>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? (bn ? 'মেনু বন্ধ করুন' : 'Close menu') : (bn ? 'মেনু খুলুন' : 'Open menu')}
            aria-expanded={mobileOpen}
            aria-controls="primary-navigation"
            id="mobile-menu-toggle"
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
