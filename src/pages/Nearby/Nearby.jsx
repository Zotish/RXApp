import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Navigation, AlertTriangle, RefreshCw } from 'lucide-react';
import { t } from '../../i18n/translations';
import { useVoice } from '../../context/VoiceContext';
import bangladeshHospitals from '../../data/bangladeshHospitals';
import './Nearby.css';

/* ── Fix Leaflet default icon paths ── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const blueIcon = new L.Icon({
  iconUrl:       'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

function SetView({ center }) {
  const map = useMap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (center) map.setView(center, 14); }, [center]);
  return null;
}

export default function Nearby({ language = 'en' }) {
  const Lng = (key) => t(key, language);

  const [location, setLocation]     = useState(null);
  const [hospitals, setHospitals]   = useState([]);
  const [mapReady, setMapReady]     = useState(false);
  const [fetching, setFetching]     = useState(false);
  const [locError, setLocError]     = useState('');
  const [fetchError, setFetchError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const { setPageBusy } = useVoice();

  useEffect(() => {
    const handleHospitalLocation = (e) => {
      const { location: locQuery } = e.detail;
      if (locQuery) {
        // Filter bangladeshHospitals by city/district name matching locQuery
        const matched = bangladeshHospitals.filter(h =>
          h.district?.toLowerCase().includes(locQuery.toLowerCase()) ||
          h.address?.toLowerCase().includes(locQuery.toLowerCase()) ||
          h.name?.toLowerCase().includes(locQuery.toLowerCase())
        );
        if (matched.length > 0) {
          setHospitals(matched);
          const first = matched[0];
          setLocation([first.lat, first.lon]);
          setMapReady(true);
        }
      }
    };

    const handleShowAllHospitals = () => {
      getLocation();
    };

    const handlePageCommand = (e) => {
      const { lower } = e.detail;
      if (!lower) return;
      if (lower.includes('112') || lower.includes('জরুরি') || lower.includes('emergency')) {
        window.location.href = 'tel:112';
      } else if (lower.includes('999') || lower.includes('অ্যাম্বুলেন্স') || lower.includes('ambulance')) {
        window.location.href = 'tel:999';
      } else if (lower.includes('16000') || lower.includes('হেল্পলাইন') || lower.includes('helpline')) {
        window.location.href = 'tel:16000';
      } else if (lower.includes('কল') || lower.includes('call') || lower.includes('ফোন')) {
        const withPhone = hospitals.find(h => h.phone || h.emergency);
        if (withPhone) window.location.href = `tel:${withPhone.phone || withPhone.emergency}`;
      } else if (lower.includes('ম্যাপ') || lower.includes('গুগল') || lower.includes('ডিরেকশন')) {
        if (hospitals.length > 0) directions(hospitals[0].lat, hospitals[0].lon);
      } else if (lower.includes('scroll') || lower.includes('স্ক্রল') || lower.includes('নিচে')) {
        document.querySelector('.hospital-cards-grid')?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    window.addEventListener('voice-hospital-location', handleHospitalLocation);
    window.addEventListener('voice-show-all-hospitals', handleShowAllHospitals);
    window.addEventListener('voice-page-command', handlePageCommand);

    return () => {
      window.removeEventListener('voice-hospital-location', handleHospitalLocation);
      window.removeEventListener('voice-show-all-hospitals', handleShowAllHospitals);
      window.removeEventListener('voice-page-command', handlePageCommand);
      setPageBusy(false);
    };
    // Hospital changes refresh these handlers; getLocation and the state setter are intentionally captured with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitals]);

  const distance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchHospitals = async ([lat, lon]) => {
    setFetching(true);
    setFetchError('');
    try {
      const q = `[out:json][timeout:25];(node["amenity"~"hospital|clinic"](around:20000,${lat},${lon});way["amenity"~"hospital|clinic"](around:20000,${lat},${lon}););out center 40;`;
      const res  = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
      const data = await res.json();
      const osmHospitals = data.elements
        .map(el => ({
          id:    'osm-' + el.id,
          name:  el.tags?.name || (el.tags?.amenity === 'hospital' ? 'Hospital' : 'Clinic'),
          lat:   el.lat ?? el.center?.lat,
          lon:   el.lon ?? el.center?.lon,
          phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
          type:  el.tags?.amenity || 'hospital',
          emergency: null,
          ambulance: null,
          helpline: null,
        }))
        .filter(h => h.lat && h.lon);

      const nearbyStatic = bangladeshHospitals
        .filter(h => distance(lat, lon, h.lat, h.lon) <= 30)
        .map(h => ({
          ...h,
          id: 'bd-' + h.id,
        }));

      const merged = [...nearbyStatic];
      for (const osm of osmHospitals) {
        const nameLower = osm.name.toLowerCase();
        const duplicate = merged.find(m =>
          distance(osm.lat, osm.lon, m.lat, m.lon) < 0.5 ||
          (m.name.toLowerCase() === nameLower) ||
          (nameLower.length > 4 && m.name.toLowerCase().includes(nameLower))
        );
        if (!duplicate) {
          merged.push(osm);
        } else if (!duplicate.phone && osm.phone) {
          duplicate.phone = osm.phone;
        }
      }

      setHospitals(merged.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      const nearbyStatic = bangladeshHospitals
        .filter(h => distance(lat, lon, h.lat, h.lon) <= 30)
        .map(h => ({ ...h, id: 'bd-' + h.id }));
      setHospitals(nearbyStatic.sort((a, b) => a.name.localeCompare(b.name)));
      setFetchError(language === 'bn'
        ? 'লাইভ হাসপাতাল ডেটা পাওয়া যায়নি—সংরক্ষিত হাসপাতাল দেখানো হচ্ছে।'
        : 'Live hospital data is unavailable—showing saved hospitals.');
    }
    setFetching(false);
  };

  function getLocation() {
    setLocError('');
    setMapReady(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setLocation(coords);
        setMapReady(true);
        fetchHospitals(coords);
      },
      () => {
        const dhaka = [23.8103, 90.4125];
        setLocation(dhaka);
        setMapReady(true);
        fetchHospitals(dhaka);
        setLocError(Lng('nearbyLocFail'));
      },
      { timeout: 10000 }
    );
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { getLocation(); }, []);

  function directions(lat, lon) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  }

  const foundText = Lng('nearbyFound').replace('{{n}}', hospitals.length);

  return (
    <div className="nearby-page" id="nearby-page">
      <div className="bg-radial-glow" />


      <div className="nearby-container">
        {/* Header */}
        <div className="section-header" style={{ marginBottom: '24px' }}>
          <h1 className="section-title"><span className="gradient-text">{Lng('nearbyTitle')}</span></h1>
        </div>

        {locError && (
          <div className="nearby-notice">
            <AlertTriangle size={15} /> {locError}
            <button className="nearby-retry-btn" onClick={getLocation}><RefreshCw size={13}/> {Lng('nearbyRetry')}</button>
          </div>
        )}

        {/* Map */}
        <div className="map-wrapper" id="hospital-map">
          {!mapReady ? (
            <div className="map-placeholder">
              <div className="loader-spinner" />
              <p>{Lng('nearbyLocating')}</p>
            </div>
          ) : (
            <MapContainer
              center={location}
              zoom={14}
              className="leaflet-map"
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <SetView center={location} />

              {/* User location */}
              <Marker position={location} icon={blueIcon}>
                <Popup><strong>📍 {Lng('nearbyYouHere')}</strong></Popup>
              </Marker>

              {/* Hospitals */}
              {hospitals.map(h => (
                <Marker key={h.id} position={[h.lat, h.lon]} icon={redIcon}>
                  <Popup>
                    <div style={{ minWidth: 170 }}>
                      <strong style={{ fontSize: '0.9rem' }}>🏥 {h.name}</strong>
                      <div style={{ fontSize: '0.75rem', marginTop: 4, color: '#666' }}>
                        {h.type === 'hospital' ? 'Hospital' : 'Clinic'}
                      </div>
                      {h.phone && (
                        <a href={`tel:${h.phone}`} style={{ display:'block', marginTop:6, fontSize:'0.8rem', color:'#06B6D4' }}>
                          📞 {h.phone}
                        </a>
                      )}
                      <button
                        onClick={() => directions(h.lat, h.lon)}
                        style={{ marginTop:8, padding:'6px 10px', background:'#06B6D4', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.78rem', width:'100%' }}
                      >
                        🗺️ {Lng('nearbyDirections')}
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}

          {fetching && (
            <div className="map-fetch-overlay">
              <div className="loader-spinner" />
              <span>{Lng('nearbyLoading')}</span>
            </div>
          )}
        </div>

        {/* Hospital Cards */}
        <AnimatePresence>
          {!fetching && hospitals.length > 0 && (
            <motion.div className="hospital-list-section" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
              <h3 className="hosp-list-title">🏥 {foundText}</h3>
              <div className="hospital-cards-grid">
                {hospitals.slice(0, 40).map((h, i) => (
                  <motion.div
                    key={h.id}
                    className={`hospital-card${expandedId === h.id ? ' expanded' : ''}`}
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={expandedId === h.id}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setExpandedId(expandedId === h.id ? null : h.id);
                    }}
                  >
                    <div className="hosp-card-top">
                      <div className="hosp-card-left">
                        <div className="hosp-card-icon">{h.type === 'hospital' ? '🏥' : '🏪'}</div>
                        <div>
                          <div className="hosp-card-name">{h.name}</div>
                          <div className="hosp-card-type">{h.type === 'hospital' ? 'Hospital' : 'Clinic'}</div>
                        </div>
                      </div>
                      <div className="hosp-card-actions" onClick={e => e.stopPropagation()}>
                        {h.phone && (
                          <a href={`tel:${h.phone}`} className="hosp-action-btn hosp-call">
                            <Phone size={14} />
                          </a>
                        )}
                        <button className="hosp-action-btn hosp-dir" onClick={() => directions(h.lat, h.lon)}>
                          <Navigation size={14} />
                        </button>
                      </div>
                    </div>

                    {expandedId === h.id && (
                      <motion.div
                        className="hosp-card-expanded"
                        initial={{ opacity:0, height:0 }}
                        animate={{ opacity:1, height:'auto' }}
                        transition={{ duration:0.25 }}
                      >
                        <div className="hosp-emergency-numbers">
                          {h.phone && (
                            <div className="hosp-emergency-row">
                              <span className="hosp-em-label">📞 {h.phone}</span>
                              <a href={`tel:${h.phone.replace(/\s/g, '')}`} className="hosp-em-call">{Lng('nearbyPhone')}</a>
                            </div>
                          )}
                          {h.emergency && (
                            <div className="hosp-emergency-row">
                              <span className="hosp-em-label">🚨 {h.emergency}</span>
                              <a href={`tel:${h.emergency.replace(/\s/g, '')}`} className="hosp-em-call hosp-em-red">{Lng('nearbyEmergency')}</a>
                            </div>
                          )}
                          {h.ambulance && (
                            <div className="hosp-emergency-row">
                              <span className="hosp-em-label">🚑 {h.ambulance}</span>
                              <a href={`tel:${h.ambulance.replace(/\s/g, '')}`} className="hosp-em-call hosp-em-red">{Lng('nearbyAmbulance')}</a>
                            </div>
                          )}
                          {h.helpline && (
                            <div className="hosp-emergency-row">
                              <span className="hosp-em-label">🏥 {h.helpline}</span>
                              <a href={`tel:${h.helpline.replace(/\s/g, '')}`} className="hosp-em-call hosp-em-orange">{Lng('nearbyHealthHelpline')}</a>
                            </div>
                          )}
                          <div className="hosp-emergency-row">
                            <span className="hosp-em-label">🆘 112</span>
                            <a href="tel:112" className="hosp-em-call hosp-em-purple">{Lng('nearbyNationalEmergency')}</a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!fetching && !fetchError && hospitals.length === 0 && mapReady && (
          <div className="nearby-empty">
            <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🏥</div>
            <p>{Lng('nearbyNoResult')}</p>
          </div>
        )}

        {fetchError && (
          <div className="nearby-notice" style={{ marginTop:16 }}>
            <AlertTriangle size={15}/> {fetchError}
          </div>
        )}
      </div>
    </div>
  );
}
