import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Stethoscope, Pill, UserCog, Activity, ShieldPlus, Users, Calendar, Plus, X, Edit, Trash2, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import './Admin.css';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18}/> },
  { id: 'conditions', label: 'Conditions', icon: <Stethoscope size={18}/> },
  { id: 'symptoms', label: 'Symptoms', icon: <Activity size={18}/> },
  { id: 'medicines', label: 'Medicines', icon: <Pill size={18}/> },
  { id: 'doctors', label: 'Doctors', icon: <UserCog size={18}/> },
  { id: 'users', label: 'Users', icon: <Users size={18}/> },
  { id: 'consultations', label: 'Consultations', icon: <Calendar size={18}/> },
  { id: 'firstaid', label: 'First Aid', icon: <ShieldPlus size={18}/> },
  { id: 'analytics', label: 'Analytics', icon: <FileText size={18}/> },
];

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [data, setData] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const loadSection = useCallback(async () => {
    try {
      if (section === 'dashboard') {
        const d = await adminAPI.getDashboard(); setStats(d);
      } else if (section === 'conditions') {
        const d = await adminAPI.getConditions(); setData(d.conditions || []);
      } else if (section === 'symptoms') {
        const d = await adminAPI.getSymptoms(); setData(d.symptoms || []);
      } else if (section === 'medicines') {
        const d = await adminAPI.getMedicines(); setData(d.medicines || []);
      } else if (section === 'doctors') {
        const d = await adminAPI.getDoctors(); setData(d.doctors || []);
      } else if (section === 'users') {
        const d = await adminAPI.getUsers(); setData(d.users || []);
      } else if (section === 'consultations') {
        const d = await adminAPI.getConsultations(); setData(d.consultations || []);
      } else if (section === 'firstaid') {
        const d = await adminAPI.getFirstAid(); setData(d.guides || []);
      } else if (section === 'analytics') {
        const d = await adminAPI.getAnalytics(30); setData(d);
      }
    } catch (err) { console.error(err); }
  }, [section]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    const timer = setTimeout(() => loadSection(), 0);
    return () => clearTimeout(timer);
  }, [user, authLoading, navigate, loadSection]);

  const handleSave = async () => {
    try {
      setError('');
      if (section === 'conditions') {
        const payload = { ...form, primary_care: form.primary_care_text?.split('\n').filter(Boolean), when_to_see_doctor: form.when_to_see_doctor_text?.split('\n').filter(Boolean), prevention_tips: form.prevention_tips_text?.split('\n').filter(Boolean), match_symptoms: form.match_symptoms_text?.split(',').map(s=>s.trim()).filter(Boolean) };
        if (form._editing) await adminAPI.updateCondition(form.id, payload);
        else await adminAPI.createCondition(payload);
      } else if (section === 'symptoms') {
        if (form._editing) await adminAPI.updateSymptom(form.id, form);
        else await adminAPI.createSymptom(form);
      } else if (section === 'medicines') {
        if (form._editing) await adminAPI.updateMedicine(form.id, form);
        else await adminAPI.createMedicine(form);
      } else if (section === 'doctors') {
        if (form._editing) await adminAPI.updateDoctor(form.id, form);
        else await adminAPI.createDoctor(form);
      } else if (section === 'firstaid') {
        const payload = { ...form, steps: form.steps_text?.split('\n').filter(Boolean) };
        if (form._editing) await adminAPI.updateFirstAid(form.id, payload);
        else await adminAPI.createFirstAid(payload);
      }
      setModal(null); setForm({}); loadSection();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      if (section === 'conditions') await adminAPI.deleteCondition(id);
      else if (section === 'symptoms') await adminAPI.deleteSymptom(id);
      else if (section === 'medicines') await adminAPI.deleteMedicine(id);
      loadSection();
    } catch (err) { console.error(err); }
  };

  const openEdit = (item) => {
    const f = { ...item, _editing: true };
    if (section === 'conditions') {
      f.primary_care_text = (item.primary_care||[]).join('\n');
      f.when_to_see_doctor_text = (item.when_to_see_doctor||[]).join('\n');
      f.prevention_tips_text = (item.prevention_tips||[]).join('\n');
      f.match_symptoms_text = (item.match_symptoms||[]).join(', ');
    }
    if (section === 'firstaid') { f.steps_text = (item.steps||[]).join('\n'); }
    setForm(f); setModal('form'); setError('');
  };

  const F = (key, label, type='text', full=false) => (
    <div className={`admin-field ${full?'admin-form-full':''}`} key={key}>
      <label>{label}</label>
      {type === 'textarea' ? (
        <textarea value={form[key]||''} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} rows={4}/>
      ) : type === 'select-severity' ? (
        <select value={form[key]||'mild'} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}>
          <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option><option value="critical">Critical</option>
        </select>
      ) : (
        <input type={type} value={form[key]||''} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}/>
      )}
    </div>
  );

  if (authLoading) {
    return <div className="admin-page"><div className="loader-spinner" aria-label="Loading admin panel" /></div>;
  }
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-page" id="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">Admin Panel</div>
        {SECTIONS.map(s => (
          <button key={s.id} className={`admin-nav-item ${section===s.id?'active':''}`} onClick={()=>{setSection(s.id);setData([]);}} id={`admin-nav-${s.id}`}>
            {s.icon} {s.label}
          </button>
        ))}
      </aside>

      <main className="admin-main">
        {/* DASHBOARD */}
        {section === 'dashboard' && stats && (
          <>
            <div className="admin-page-header"><h1 className="admin-page-title">Dashboard</h1></div>
            <div className="stats-grid">
              {[
                { icon:'👥', label:'Users', value:stats.stats.totalUsers, bg:'rgba(6,182,212,0.1)' },
                { icon:'🦠', label:'Conditions', value:stats.stats.totalConditions, bg:'rgba(139,92,246,0.1)' },
                { icon:'🔍', label:'Symptoms', value:stats.stats.totalSymptoms, bg:'rgba(16,185,129,0.1)' },
                { icon:'💊', label:'Medicines', value:stats.stats.totalMedicines, bg:'rgba(245,158,11,0.1)' },
                { icon:'👨‍⚕️', label:'Doctors', value:stats.stats.totalDoctors, bg:'rgba(59,130,246,0.1)' },
                { icon:'📞', label:'Consultations', value:stats.stats.totalConsultations, bg:'rgba(236,72,153,0.1)' },
                { icon:'⏳', label:'Pending', value:stats.stats.pendingConsultations, bg:'rgba(239,68,68,0.1)' },
                { icon:'📊', label:'Symptom Checks', value:stats.stats.totalChecks, bg:'rgba(16,185,129,0.1)' },
              ].map((s,i) => (
                <motion.div key={i} className="stat-card" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}>
                  <div className="stat-icon" style={{background:s.bg}}>{s.icon}</div>
                  <div className="stat-value gradient-text">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </motion.div>
              ))}
            </div>
            {stats.recentUsers?.length > 0 && (
              <div className="admin-table-wrapper">
                <table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Plan</th><th>Joined</th></tr></thead>
                <tbody>{stats.recentUsers.map(u=>(
                  <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td><span className="admin-badge badge-active">{u.role}</span></td><td>{u.subscription_plan}</td><td>{new Date(u.created_at).toLocaleDateString()}</td></tr>
                ))}</tbody></table>
              </div>
            )}
          </>
        )}

        {/* CONDITIONS */}
        {section === 'conditions' && (
          <>
            <div className="admin-page-header">
              <h1 className="admin-page-title">Conditions / Diseases</h1>
              <button className="admin-btn-add" onClick={()=>{setForm({});setModal('form');setError('');}}><Plus size={16}/>Add Condition</button>
            </div>
            <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>ID</th><th>Name</th><th>Name (BN)</th><th>Severity</th><th>Symptoms</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{data.map(c=>(
              <tr key={c.id}><td>{c.id}</td><td><strong>{c.name}</strong></td><td>{c.name_bn||'—'}</td><td><span className={`severity-badge severity-${c.severity}`}>{c.severity}</span></td><td>{(c.match_symptoms||[]).length}</td><td><span className={`admin-badge ${c.is_active?'badge-active':'badge-inactive'}`}>{c.is_active?'Active':'Off'}</span></td>
              <td><div className="admin-actions"><button className="admin-btn-sm" onClick={()=>openEdit(c)}><Edit size={12}/></button><button className="admin-btn-sm danger" onClick={()=>handleDelete(c.id)}><Trash2 size={12}/></button></div></td></tr>
            ))}</tbody></table></div>
          </>
        )}

        {/* SYMPTOMS */}
        {section === 'symptoms' && (
          <>
            <div className="admin-page-header"><h1 className="admin-page-title">Symptoms</h1>
              <button className="admin-btn-add" onClick={()=>{setForm({});setModal('form');setError('');}}><Plus size={16}/>Add Symptom</button></div>
            <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>ID</th><th>Icon</th><th>Label</th><th>Label (BN)</th><th>Category</th><th>Emergency</th><th>Actions</th></tr></thead>
            <tbody>{data.map(s=>(
              <tr key={s.id}><td>{s.id}</td><td>{s.icon}</td><td>{s.label}</td><td>{s.label_bn||'—'}</td><td>{s.category}</td><td>{s.is_emergency?'🚨':'—'}</td>
              <td><div className="admin-actions"><button className="admin-btn-sm" onClick={()=>openEdit(s)}><Edit size={12}/></button><button className="admin-btn-sm danger" onClick={()=>handleDelete(s.id)}><Trash2 size={12}/></button></div></td></tr>
            ))}</tbody></table></div>
          </>
        )}

        {/* MEDICINES */}
        {section === 'medicines' && (
          <>
            <div className="admin-page-header"><h1 className="admin-page-title">Medicines</h1>
              <button className="admin-btn-add" onClick={()=>{setForm({});setModal('form');setError('');}}><Plus size={16}/>Add Medicine</button></div>
            <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Name</th><th>Generic</th><th>Category</th><th>Adults Dose</th><th>OTC</th><th>Actions</th></tr></thead>
            <tbody>{data.map(m=>(
              <tr key={m.id}><td><strong>{m.name}</strong></td><td>{m.generic_name||'—'}</td><td>{m.category||'—'}</td><td>{m.dosage_adults||'—'}</td><td>{m.is_otc?'Yes':'No'}</td>
              <td><div className="admin-actions"><button className="admin-btn-sm" onClick={()=>openEdit(m)}><Edit size={12}/></button><button className="admin-btn-sm danger" onClick={()=>handleDelete(m.id)}><Trash2 size={12}/></button></div></td></tr>
            ))}</tbody></table></div>
          </>
        )}

        {/* DOCTORS */}
        {section === 'doctors' && (
          <>
            <div className="admin-page-header"><h1 className="admin-page-title">Doctors</h1>
              <button className="admin-btn-add" onClick={()=>{setForm({});setModal('form');setError('');}}><Plus size={16}/>Add Doctor</button></div>
            <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Name</th><th>Specialization</th><th>Experience</th><th>Fee</th><th>Rating</th><th>Actions</th></tr></thead>
            <tbody>{data.map(d=>(
              <tr key={d.id}><td><strong>{d.name}</strong></td><td>{d.specialization}</td><td>{d.experience_years}y</td><td>${d.consultation_fee}</td><td>⭐{d.rating}</td>
              <td><button className="admin-btn-sm" onClick={()=>openEdit(d)}><Edit size={12}/></button></td></tr>
            ))}</tbody></table></div>
          </>
        )}

        {/* USERS */}
        {section === 'users' && (
          <>
            <div className="admin-page-header"><h1 className="admin-page-title">Users</h1></div>
            <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Plan</th><th>Language</th><th>Joined</th></tr></thead>
            <tbody>{data.map(u=>(
              <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td><span className="admin-badge badge-active">{u.role}</span></td><td>{u.subscription_plan}</td><td>{u.language}</td><td>{new Date(u.created_at).toLocaleDateString()}</td></tr>
            ))}</tbody></table></div>
          </>
        )}

        {/* CONSULTATIONS */}
        {section === 'consultations' && (
          <>
            <div className="admin-page-header"><h1 className="admin-page-title">Consultations</h1></div>
            {data.length === 0 ? <div className="admin-empty"><div className="admin-empty-icon">📞</div><p>No consultations yet</p></div> :
            <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{data.map(c=>(
              <tr key={c.id}><td>{c.user_name||c.user_email}</td><td>{c.doctor_name}</td><td>{c.scheduled_at?new Date(c.scheduled_at).toLocaleString():'—'}</td>
              <td><span className={`consultation-status status-${c.status}`}>{c.status}</span></td>
              <td><select defaultValue={c.status} onChange={e=>adminAPI.updateConsultationStatus(c.id,e.target.value).then(loadSection)} style={{padding:'4px 8px',borderRadius:'6px',background:'var(--color-bg-elevated)',border:'1px solid var(--color-border)',color:'var(--color-text-primary)',fontSize:'0.8rem'}}>
                <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select></td></tr>
            ))}</tbody></table></div>}
          </>
        )}

        {/* FIRST AID */}
        {section === 'firstaid' && (
          <>
            <div className="admin-page-header"><h1 className="admin-page-title">First Aid Guides</h1>
              <button className="admin-btn-add" onClick={()=>{setForm({});setModal('form');setError('');}}><Plus size={16}/>Add Guide</button></div>
            <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>Icon</th><th>Title</th><th>Urgency</th><th>Steps</th><th>Actions</th></tr></thead>
            <tbody>{data.map(g=>(
              <tr key={g.id}><td>{g.icon}</td><td><strong>{g.title}</strong></td><td><span className={`firstaid-card-urgency urgency-${g.urgency}`}>{g.urgency}</span></td><td>{(g.steps||[]).length}</td>
              <td><button className="admin-btn-sm" onClick={()=>openEdit(g)}><Edit size={12}/></button></td></tr>
            ))}</tbody></table></div>
          </>
        )}

        {/* ANALYTICS */}
        {section === 'analytics' && (
          <>
            <div className="admin-page-header"><h1 className="admin-page-title">Analytics (Last 30 Days)</h1></div>
            {data.dailyUsers && (
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon" style={{background:'rgba(6,182,212,0.1)'}}>📈</div><div className="stat-value gradient-text">{data.dailyUsers?.reduce((a,b)=>a+b.count,0)||0}</div><div className="stat-label">New Users (30d)</div></div>
                <div className="stat-card"><div className="stat-icon" style={{background:'rgba(139,92,246,0.1)'}}>🔍</div><div className="stat-value gradient-text">{data.eventCounts?.filter(e=>e.event_type==='symptom_check').reduce((a,b)=>a+b.count,0)||0}</div><div className="stat-label">Symptom Checks</div></div>
                <div className="stat-card"><div className="stat-icon" style={{background:'rgba(16,185,129,0.1)'}}>📞</div><div className="stat-value gradient-text">{data.eventCounts?.filter(e=>e.event_type==='consultation_booked').reduce((a,b)=>a+b.count,0)||0}</div><div className="stat-label">Consultations</div></div>
              </div>
            )}
          </>
        )}
      </main>

      {/* FORM MODAL */}
      {modal === 'form' && (
        <div className="admin-modal-overlay" onClick={()=>setModal(null)}>
          <div className="admin-modal" onClick={e=>e.stopPropagation()}>
            <h3>{form._editing ? 'Edit' : 'Add'} {section.charAt(0).toUpperCase()+section.slice(1)} <button onClick={()=>setModal(null)} style={{background:'none',color:'var(--color-text-muted)',cursor:'pointer'}}><X size={20}/></button></h3>
            {error && <div className="auth-error">{error}</div>}
            <div className="admin-form-grid">
              {section === 'conditions' && (<>
                {F('name','Name (EN)')}{F('name_bn','Name (BN)')}{F('name_hi','Name (HI)')}{F('severity','Severity','select-severity')}{F('category','Category')}
                {F('description','Description (EN)','textarea',true)}{F('description_bn','Description (BN)','textarea',true)}
                {F('primary_care_text','Primary Care (one per line)','textarea',true)}{F('when_to_see_doctor_text','When to See Doctor (one per line)','textarea',true)}
                {F('prevention_tips_text','Prevention Tips (one per line)','textarea',true)}{F('match_symptoms_text','Matching Symptoms (comma-separated)','text',true)}{F('min_match','Min Matches','number')}
              </>)}
              {section === 'symptoms' && (<>{F('id','ID')}{F('label','Label (EN)')}{F('label_bn','Label (BN)')}{F('label_hi','Label (HI)')}{F('category','Category')}{F('icon','Icon (emoji)')}{F('body_region','Body Region')}</>)}
              {section === 'medicines' && (<>{F('name','Brand Name')}{F('generic_name','Generic Name')}{F('category','Category')}{F('dosage_adults','Adults Dosage')}{F('dosage_children','Children Dosage')}{F('side_effects','Side Effects','textarea',true)}{F('contraindications','Contraindications','textarea',true)}{F('description','Description','textarea',true)}</>)}
              {section === 'doctors' && (<>{F('name','Full Name')}{F('email','Email','email')}{!form._editing&&F('password','Password','password')}{F('specialization','Specialization')}{F('qualification','Qualification')}{F('experience_years','Experience (years)','number')}{F('consultation_fee','Fee ($)','number')}{F('bio','Bio','textarea',true)}</>)}
              {section === 'firstaid' && (<>{F('title','Title (EN)')}{F('title_bn','Title (BN)')}{F('icon','Icon (emoji)')}{F('urgency','Urgency')}{F('steps_text','Steps (one per line)','textarea',true)}</>)}
            </div>
            <div className="booking-actions" style={{marginTop:'16px'}}>
              <button className="plan-btn plan-btn-secondary" onClick={()=>setModal(null)} style={{flex:1}}>Cancel</button>
              <button className="plan-btn plan-btn-primary" onClick={handleSave} style={{flex:1}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
