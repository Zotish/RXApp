import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Shield, MapPin, Stethoscope } from 'lucide-react';
import { t } from '../../i18n/translations';
import './BottomNav.css';

export default function BottomNav({ language = 'en' }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const L = (key) => t(key, language);

  const items = [
    { path: '/', icon: Home, label: L('home') },
    { path: '/symptom-checker', icon: Search, label: language === 'bn' ? 'লক্ষণ' : 'Check' },
    { path: '/first-aid', icon: Shield, label: L('firstAid') },
    { path: '/nearby', icon: MapPin, label: language === 'bn' ? 'হাসপাতাল' : 'Hospitals' },
    { path: '/teleconsultation', icon: Stethoscope, label: language === 'bn' ? 'ডাক্তার' : 'Doctor' },
  ];

  return (
    <nav className="bottom-nav" aria-label={language === 'bn' ? 'মূল মেনু' : 'Main menu'}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
        return (
          <button
            key={item.path}
            type="button"
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
