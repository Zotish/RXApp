import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Clock, Award, Video, Calendar, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { publicAPI } from '../../services/api';
import { t } from '../../i18n/translations';
import './Teleconsultation.css';

export default function Teleconsultation({ language = 'en' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const L = (key) => t(key, language);
  const [allDoctors, setAllDoctors] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [myConsultations, setMyConsultations] = useState([]);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    // Load doctors
    publicAPI.getDoctors()
      .then(data => {
        const list = data.doctors || [];
        setAllDoctors(list);
        setDoctors(list);
      })
      .catch(() => {
        // Demo doctors
        const fallbackDoctors = [
          { id: '1', name: 'Dr. Sarah Chen', specialization: 'General Medicine', qualification: 'MBBS, MD', experience_years: 12, consultation_fee: 15, rating: 4.8, total_consultations: 450, bio: 'Experienced general physician specializing in primary care and preventive medicine.' },
          { id: '2', name: 'Dr. Arif Rahman', specialization: 'Internal Medicine', qualification: 'MBBS, FCPS', experience_years: 8, consultation_fee: 12, rating: 4.9, total_consultations: 320, bio: 'Expert in internal medicine with focus on chronic disease management.' },
          { id: '3', name: 'Dr. Priya Sharma', specialization: 'Pediatrics', qualification: 'MBBS, DCH', experience_years: 15, consultation_fee: 18, rating: 4.7, total_consultations: 600, bio: 'Pediatric specialist with extensive experience in child healthcare and development.' },
        ];
        setAllDoctors(fallbackDoctors);
        setDoctors(fallbackDoctors);
      });

    // Load consultations if logged in
    if (user) {
      publicAPI.getMyConsultations()
        .then(data => setMyConsultations(data.consultations || []))
        .catch(() => {});
    }
  }, [user]);

  // Voice Event Listeners
  useEffect(() => {
    const handleDoctorFilter = (e) => {
      const { preference } = e.detail;
      if (preference && allDoctors.length > 0) {
        const aliases = {
          'হৃদরোগ': 'cardiology', 'হার্ট': 'cardiology', 'শিশু': 'pediatrics',
          'চর্মরোগ': 'dermatology', 'মেডিসিন': 'medicine',
        };
        const normalized = aliases[preference.toLowerCase()] || preference.toLowerCase();
        if (['সব', 'all', 'show all'].includes(normalized)) {
          setDoctors(allDoctors);
          return;
        }
        const filtered = allDoctors.filter(d =>
          d.specialization?.toLowerCase().includes(normalized) ||
          d.name?.toLowerCase().includes(normalized)
        );
        if (filtered.length > 0) {
          setDoctors(filtered);
          setBookingDoctor(filtered[0]);
          setBookingError('');
        } else {
          setDoctors(allDoctors);
          setBookingError(language === 'bn' ? 'এই বিশেষজ্ঞ এখন পাওয়া যাচ্ছে না। সব ডাক্তার দেখানো হচ্ছে।' : 'That specialty is unavailable. Showing all doctors.');
        }
      }
    };

    const handleBookAppointment = () => {
      if (doctors.length > 0) {
        setBookingDoctor(doctors[0]);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        setBookingDate(tomorrow.toISOString().slice(0, 16));
      }
    };

    const handleShowHistory = () => {
      document.getElementById('my-consultations')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleShowDoctors = () => {
      document.getElementById('doctors-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handlePageCommand = (e) => {
      const { lower } = e.detail;
      if (!lower) return;
      if (lower.includes('ইতিহাস') || lower.includes('history')) handleShowHistory();
      else if (lower.includes('ডাক্তার') || lower.includes('doctor')) handleShowDoctors();
      else if (lower.includes('বুক') || lower.includes('book')) handleBookAppointment();
    };

    window.addEventListener('voice-doctor-filter', handleDoctorFilter);
    window.addEventListener('voice-book-appointment', handleBookAppointment);
    window.addEventListener('voice-show-history', handleShowHistory);
    window.addEventListener('voice-show-doctors', handleShowDoctors);
    window.addEventListener('voice-page-command', handlePageCommand);

    return () => {
      window.removeEventListener('voice-doctor-filter', handleDoctorFilter);
      window.removeEventListener('voice-book-appointment', handleBookAppointment);
      window.removeEventListener('voice-show-history', handleShowHistory);
      window.removeEventListener('voice-show-doctors', handleShowDoctors);
      window.removeEventListener('voice-page-command', handlePageCommand);
    };
  }, [doctors, allDoctors, language]);

  useEffect(() => {
    if (!bookingDoctor) return;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setBookingDoctor(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [bookingDoctor]);

  const handleBooking = async () => {
    if (!user) {
      navigate('/login?redirect=%2Fteleconsultation');
      return;
    }
    if (!bookingDate) {
      setBookingError('Please select a date and time');
      return;
    }
    setBooking(true);
    setBookingError('');
    try {
      await publicAPI.bookConsultation({
        doctor_id: bookingDoctor.id,
        scheduled_at: bookingDate,
        notes: bookingNotes,
      });
      setBookingDoctor(null);
      setBookingDate('');
      setBookingNotes('');
      // Refresh consultations
      const data = await publicAPI.getMyConsultations();
      setMyConsultations(data.consultations || []);
      setBookingSuccess(language === 'bn' ? 'অ্যাপয়েন্টমেন্ট বুক হয়েছে।' : 'Appointment booked successfully.');
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="tele-page" id="teleconsultation-page">
      <div className="bg-radial-glow" />

      <div className="tele-container">
        {/* Available Doctors */}
        <section className="doctors-section" id="doctors-section">
          <div className="section-header" style={{ marginBottom: '24px' }}>
            <h1 className="section-title">
              <span className="gradient-text">{L('ourDoctors')}</span>
            </h1>
          </div>

          <div className="doctors-grid">
            {doctors.length === 0 && (
              <div className="auth-error" role="status">
                {language === 'bn' ? 'এই মুহূর্তে কোনো ডাক্তার পাওয়া যাচ্ছে না।' : 'No doctors are available right now.'}
              </div>
            )}
            {doctors.map((doctor, i) => (
              <motion.div
                key={doctor.id}
                className="doctor-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                id={`doctor-${doctor.id}`}
              >
                <div className="doctor-avatar">👨‍⚕️</div>
                <h3 className="doctor-name">{doctor.name}</h3>
                <p className="doctor-spec">{doctor.specialization}</p>
                <p className="doctor-info">{doctor.bio}</p>

                <div className="doctor-meta">
                  <span className="doctor-meta-item">
                    <Award size={14} /> {doctor.qualification}
                  </span>
                  <span className="doctor-meta-item">
                    <Clock size={14} /> {doctor.experience_years}+ years
                  </span>
                  <span className="doctor-meta-item">
                    <Star size={14} style={{ color: '#F59E0B' }} /> {doctor.rating}
                  </span>
                  <span className="doctor-meta-item">
                    <Video size={14} /> {doctor.total_consultations} {L('sessions')}
                  </span>
                </div>

                <p className="doctor-fee">${doctor.consultation_fee} / {L('session')}</p>

                <button
                  className="doctor-book-btn"
                  onClick={() => {
                    if (!user) { navigate('/login?redirect=%2Fteleconsultation'); return; }
                    setBookingDoctor(doctor);
                    setBookingError('');
                  }}
                >
                  {t('bookNow', language)}
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* My Consultations */}
        {user && myConsultations.length > 0 && (
          <section className="consultations-list" id="my-consultations">
            <h3 style={{ marginBottom: '16px' }}>{L('myConsultations')}</h3>
            {myConsultations.map(c => (
              <div key={c.id} className="consultation-item">
                <div>
                  <strong>{c.doctor_name}</strong> — {c.specialization}
                  <br />
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    <Calendar size={12} style={{ verticalAlign: 'middle' }} /> {new Date(c.scheduled_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`consultation-status status-${c.status}`}>{c.status}</span>
                  {c.meeting_link && c.status !== 'cancelled' && (
                    <a href={c.meeting_link} target="_blank" rel="noopener noreferrer"
                      className="doctor-book-btn" style={{ width: 'auto', padding: '6px 16px', fontSize: '0.8rem' }}>
                      <Video size={14} /> {L('join')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      {bookingSuccess && (
        <div className="nearby-notice" role="status" style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 300 }}>
          {bookingSuccess}
          <button onClick={() => setBookingSuccess('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* Booking Modal */}
      {bookingDoctor && (
        <div className="booking-modal-overlay" onClick={() => setBookingDoctor(null)}>
          <motion.div
            className="booking-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id="booking-modal-title">{L('bookConsultationTitle')}</h3>
              <button onClick={() => setBookingDoctor(null)} aria-label={L('cancel')} style={{ background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              {L('withDoctor')} <strong>{bookingDoctor.name}</strong> — {bookingDoctor.specialization}
            </p>

            {bookingError && <div className="auth-error">{bookingError}</div>}

            <div className="booking-field">
              <label>{L('dateTime')}</label>
              <input
                type="datetime-local"
                value={bookingDate}
                onChange={e => setBookingDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="booking-field">
              <label>{L('describeConcern')}</label>
              <textarea
                rows={3}
                value={bookingNotes}
                onChange={e => setBookingNotes(e.target.value)}
                placeholder="..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="booking-actions">
              <button className="plan-btn plan-btn-secondary" onClick={() => setBookingDoctor(null)} style={{ flex: 1 }}>
                {L('cancel')}
              </button>
              <button className="plan-btn plan-btn-primary" onClick={handleBooking} disabled={booking} style={{ flex: 1 }}>
                {booking ? L('loading') : `${L('confirmBooking')} — $${bookingDoctor.consultation_fee}`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
