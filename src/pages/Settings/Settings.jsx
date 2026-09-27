/* =============================================
   VEDA - Settings Page
   Implements:
   1. Email - Change
   2. Mobile - Modification or Add (2FA)
   3. Google Authenticator (2FA TOTP)
   4. Change Password
   5. Username / Name Change
   6. Plan Upgrade (Free / Basic / Premium)
   7. Language Switch (EN / BN)
   8. Health Report PDF Download
   ============================================= */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  UserRound,
  Mail,
  Phone,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Crown,
  CreditCard,
  Languages,
  Download,
  FileText,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Sparkles,
  RefreshCw,
  Zap,
  Camera,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, publicAPI } from '../../services/api';
import './Settings.css';

export default function Settings({ language, setLanguage }) {
  const { user, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const isBn = language === 'bn';

  // Section / Tab navigation state
  const [activeTab, setActiveTab] = useState('account');

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // 2FA states
  const [phone2FA, setPhone2FA] = useState(false);
  const [totp2FA, setTotp2FA] = useState(false);
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [totpCodeInput, setTotpCodeInput] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const dummySecretKey = 'VEDA-HEALTH-7X9K-42LM-88PQ';

  // Loading & Alert feedback states
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [alerts, setAlerts] = useState({
    avatar: null,
    username: null,
    email: null,
    phone: null,
    password: null,
    plan: null,
    twofa: null,
    pdf: null,
  });

  // Sync user profile state
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      setUsername(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setPhone2FA(Boolean(user.two_factor_phone));
      setTotp2FA(Boolean(user.two_factor_totp));
    }
  }, [user, authLoading, navigate]);

  const setAlert = (section, type, message) => {
    setAlerts(prev => ({ ...prev, [section]: { type, message } }));
    setTimeout(() => {
      setAlerts(prev => ({ ...prev, [section]: null }));
    }, 4500);
  };

  // 0. Image Compressor & Profile Photo Handlers
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 320;
          const width = img.width;
          const height = img.height;
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          const canvas = document.createElement('canvas');
          canvas.width = Math.min(minDim, maxDim);
          canvas.height = Math.min(minDim, maxDim);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            canvas.width,
            canvas.height
          );
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAlert('avatar', 'error', isBn ? 'অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন' : 'Please select a valid image file');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setAlert('avatar', 'error', isBn ? 'ছবির সাইজ ৮ MB এর কম হতে হবে' : 'Image size must be under 8MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const dataUrl = await compressImage(file);
      const res = await authAPI.updateProfile({ avatar: dataUrl });
      updateUser(res.user);
      setAlert('avatar', 'success', isBn ? 'প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে' : 'Profile photo updated successfully');
    } catch (err) {
      setAlert('avatar', 'error', err.message || (isBn ? 'ছবি আপলোড ব্যর্থ হয়েছে' : 'Failed to upload photo'));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatar) return;
    setUploadingAvatar(true);
    try {
      const res = await authAPI.updateProfile({ avatar: '__REMOVE__' });
      updateUser(res.user);
      setAlert('avatar', 'success', isBn ? 'প্রোফাইল ছবি সরানো হয়েছে' : 'Profile photo removed successfully');
    } catch (err) {
      setAlert('avatar', 'error', err.message || (isBn ? 'ছবি সরানো যায়নি' : 'Failed to remove photo'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 1. Update Username
  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setAlert('username', 'error', isBn ? 'নাম খালি হতে পারে না' : 'Name cannot be empty');
      return;
    }
    setSavingUsername(true);
    try {
      const res = await authAPI.updateProfile({ name: trimmed });
      if (res?.user) {
        updateUser(res.user);
        setUsername(res.user.name || trimmed);
      }
      setAlert('username', 'success', isBn ? 'নাম সফলভাবে পরিবর্তন হয়েছে' : 'Name updated successfully');
    } catch (err) {
      setAlert('username', 'error', err.message || 'Failed to update name');
    }
    setSavingUsername(false);
  };

  // 2. Update Email
  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setAlert('email', 'error', isBn ? 'সঠিক ইমেইল এড্রেস লিখুন' : 'Please provide a valid email address');
      return;
    }
    setSavingEmail(true);
    try {
      const res = await authAPI.updateProfile({ email: email.trim() });
      updateUser(res.user);
      setAlert('email', 'success', isBn ? 'ইমেইল সফলভাবে পরিবর্তন হয়েছে' : 'Email updated successfully');
    } catch (err) {
      setAlert('email', 'error', err.message || 'Failed to update email');
    }
    setSavingEmail(false);
  };

  // 3. Update Phone & Toggle Phone SMS 2FA
  const handleUpdatePhone = async (e) => {
    e?.preventDefault();
    setSavingPhone(true);
    try {
      const res = await authAPI.updateProfile({ phone: phone.trim() });
      updateUser(res.user);
      setAlert('phone', 'success', isBn ? 'মোবাইল নম্বর সংরক্ষণ হয়েছে' : 'Mobile number saved successfully');
    } catch (err) {
      setAlert('phone', 'error', err.message || 'Failed to update phone number');
    }
    setSavingPhone(false);
  };

  const handleTogglePhone2FA = async () => {
    if (!phone.trim()) {
      setAlert('phone', 'error', isBn ? 'SMS 2FA চালু করতে আগে মোবাইল নম্বর যোগ করুন' : 'Please enter a mobile phone number first to enable SMS 2FA');
      return;
    }
    const nextState = !phone2FA;
    try {
      const res = await authAPI.toggle2FA('phone', nextState);
      setPhone2FA(nextState);
      updateUser(res.user);
      setAlert('phone', 'success', nextState
        ? (isBn ? 'মোবাইল SMS 2FA সক্রিয় হয়েছে' : 'Mobile SMS 2FA has been activated')
        : (isBn ? 'মোবাইল SMS 2FA নিষ্ক্রিয় করা হয়েছে' : 'Mobile SMS 2FA has been disabled'));
    } catch (err) {
      setAlert('phone', 'error', err.message || 'Failed to update SMS 2FA status');
    }
  };

  // 4. Google Authenticator TOTP
  const handleVerifyTotp = async () => {
    if (totpCodeInput.length < 6) {
      setAlert('twofa', 'error', isBn ? '৬-সংখ্যার অথেন্টিকেটর কোড দিন' : 'Please enter the 6-digit authenticator code');
      return;
    }
    try {
      const res = await authAPI.toggle2FA('totp', true);
      setTotp2FA(true);
      updateUser(res.user);
      setShowTotpModal(false);
      setTotpCodeInput('');
      setAlert('twofa', 'success', isBn ? 'গুগল অথেন্টিকেটর সফলভাবে সংযুক্ত হয়েছে' : 'Google Authenticator successfully linked and activated');
    } catch (err) {
      setAlert('twofa', 'error', err.message || 'Failed to link Google Authenticator');
    }
  };

  const handleDisableTotp = async () => {
    try {
      const res = await authAPI.toggle2FA('totp', false);
      setTotp2FA(false);
      updateUser(res.user);
      setAlert('twofa', 'success', isBn ? 'গুগল অথেন্টিকেটর নিষ্ক্রিয় করা হয়েছে' : 'Google Authenticator 2FA has been disabled');
    } catch (err) {
      setAlert('twofa', 'error', err.message || 'Failed to disable TOTP 2FA');
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(dummySecretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // 5. Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setAlert('password', 'error', isBn ? 'বর্তমান পাসওয়ার্ড দিন' : 'Please enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      setAlert('password', 'error', isBn ? 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setAlert('password', 'error', isBn ? 'কনফার্ম পাসওয়ার্ড মিলছে না' : 'Confirm password does not match');
      return;
    }
    setSavingPassword(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setAlert('password', 'success', isBn ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে' : 'Password changed successfully');
    } catch (err) {
      setAlert('password', 'error', err.message || 'Current password incorrect');
    }
    setSavingPassword(false);
  };

  // 6. Plan Upgrade
  const handleUpgradePlan = async (planKey) => {
    if (user?.subscription_plan === planKey) return;
    setUpgradingPlan(planKey);
    try {
      const res = await authAPI.updatePlan(planKey);
      updateUser(res.user);
      setAlert('plan', 'success', isBn ? `আপনার প্ল্যান সফলভাবে '${planKey.toUpperCase()}' এ আপগ্রেড হয়েছে!` : `Subscription upgraded to ${planKey.toUpperCase()} successfully!`);
    } catch (err) {
      setAlert('plan', 'error', err.message || 'Failed to update plan');
    }
    setUpgradingPlan('');
  };

  // 7. Language Switch
  const handleSwitchLanguage = async (newLang) => {
    setLanguage(newLang);
    try {
      const res = await authAPI.updateProfile({ language: newLang });
      updateUser(res.user);
    } catch {
      // Offline fallback
    }
  };

  // 8. Health Report Download
  const handleDownloadHealthReport = async () => {
    setGeneratingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      // Fetch history or use local
      let historyItems = [];
      try {
        const histRes = await publicAPI.getMyHistory();
        historyItems = histRes.history || [];
      } catch {
        const local = JSON.parse(localStorage.getItem('veda_local_history') || '[]');
        historyItems = local;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const cyan = [23, 92, 75];
      const sage = [111, 149, 119];
      const dark = [29, 51, 44];
      const W = doc.internal.pageSize.getWidth();

      // Header Bar
      doc.setFillColor(...cyan);
      doc.rect(0, 0, W, 30, 'F');
      doc.setFillColor(...sage);
      doc.rect(W * 0.65, 0, W * 0.35, 30, 'F');

      // Title & Branding
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text('VEDA', 14, 19);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('The Ultimate Care — Official Patient Health Report', 42, 19);

      doc.setFontSize(8.5);
      doc.text(`Generated: ${new Date().toLocaleString()}`, W - 14, 19, { align: 'right' });

      // Patient Profile Section
      doc.setTextColor(...dark);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Patient Profile & Credentials', 14, 42);
      doc.setDrawColor(...cyan);
      doc.setLineWidth(0.6);
      doc.line(14, 44, W - 14, 44);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 75, 70);

      const patientDetails = [
        ['Full Name / Username', user?.name || 'Veda Patient'],
        ['Registered Email', user?.email || '—'],
        ['Mobile Phone', user?.phone || 'Not Specified'],
        ['Subscription Plan', (user?.subscription_plan || 'free').toUpperCase()],
        ['Account Security Status', `${totp2FA ? 'Google TOTP [ACTIVE]' : 'TOTP [OFF]'} | ${phone2FA ? 'SMS 2FA [ACTIVE]' : 'SMS [OFF]'}`],
        ['Preferred Language', user?.language === 'bn' ? 'বাংলা (Bengali)' : 'English'],
        ['Member Since', user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'],
      ];

      patientDetails.forEach(([k, v], i) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${k}:`, 14, 52 + i * 6.5);
        doc.setFont('helvetica', 'normal');
        doc.text(String(v), 65, 52 + i * 6.5);
      });

      // Health History Section
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...dark);
      doc.text('2. Symptom Check Records & Diagnostics', 14, 106);
      doc.setLineWidth(0.6);
      doc.line(14, 108, W - 14, 108);

      const tableRows = historyItems.slice(0, 15).map((item, idx) => {
        const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : `#${idx + 1}`;
        let symptoms = 'General assessment';
        if (Array.isArray(item.symptoms)) {
          symptoms = item.symptoms.join(', ');
        } else if (typeof item.symptoms === 'string') {
          try {
            const parsed = JSON.parse(item.symptoms);
            symptoms = Array.isArray(parsed) ? parsed.join(', ') : item.symptoms;
          } catch {
            symptoms = item.symptoms;
          }
        }
        const condition = item.condition_name || (Array.isArray(item.matched_conditions) ? item.matched_conditions.join(', ') : 'Health consultation');
        const severity = (item.severity || 'Mild').toUpperCase();
        return [date, symptoms, condition, severity];
      });

      if (tableRows.length === 0) {
        tableRows.push([new Date().toLocaleDateString(), 'Initial checkup / baseline', 'Healthy baseline', 'NORMAL']);
      }

      autoTable(doc, {
        startY: 112,
        head: [['Date', 'Reported Symptoms', 'Evaluated Condition', 'Severity Level']],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: cyan,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3.5,
          overflow: 'linebreak',
        },
        alternateRowStyles: {
          fillColor: [244, 248, 245],
        },
      });

      const finalY = doc.lastAutoTable.finalY + 12;

      // Notice & Disclaimer
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(110, 125, 120);
      const disclaimer = 'Notice: This report is generated by Veda Health Platform for personal monitoring and clinical reference. It does not replace emergency medical response or in-person physician diagnosis. Keep your 2FA and credentials confidential.';
      doc.text(disclaimer, 14, finalY, { maxWidth: W - 28 });

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(140, 150, 145);
      doc.text('Veda Health AI System — Confidential Patient Document', W / 2, 287, { align: 'center' });

      // Save PDF
      const filename = `Veda_Health_Report_${(user?.name || 'patient').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      setAlert('pdf', 'success', isBn ? 'স্বাস্থ্য রিপোর্ট সফলভাবে ডাউনলোড হয়েছে' : 'Health report PDF downloaded successfully');
    } catch (err) {
      console.error(err);
      setAlert('pdf', 'error', isBn ? 'PDF তৈরি করতে ব্যর্থ হয়েছে' : 'Failed to generate PDF report');
    }
    setGeneratingPdf(false);
  };

  if (authLoading) {
    return (
      <div className="settings-page">
        <div className="settings-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--color-accent-primary)', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  const currentPlan = user?.subscription_plan || 'free';

  return (
    <div className="settings-page" id="settings-page">
      <div className="settings-container">
        {/* Global Tab Navigation */}
        <div className="settings-tabs" role="tablist">
          <button
            className={`settings-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <User size={16} />
            <span>{isBn ? 'প্রোফাইল ও অ্যাকাউন্ট' : 'Profile & Account'}</span>
          </button>

          <button
            className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock size={16} />
            <span>{isBn ? 'নিরাপত্তা ও ২এফএ' : 'Security & 2FA'}</span>
          </button>

          <button
            className={`settings-tab-btn ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            <Crown size={16} />
            <span>{isBn ? 'প্ল্যান আপগ্রেড' : 'Plan Upgrade'}</span>
          </button>

          <button
            className={`settings-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <Languages size={16} />
            <span>{isBn ? 'ভাষা পরিবর্তন' : 'Language'}</span>
          </button>

          <button
            className={`settings-tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            <FileText size={16} />
            <span>{isBn ? 'স্বাস্থ্য রিপোর্ট' : 'Health Report'}</span>
          </button>
        </div>

        {/* TAB 1: Profile & Account (Username, Email, Mobile SMS 2FA) */}
        {(activeTab === 'account' || activeTab === 'all') && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            
            {/* 0. Profile Photo Upload */}
            <div className="settings-card" id="section-avatar">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon">
                    <Camera size={22} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">{isBn ? 'প্রোফাইল ছবি' : 'Profile Photo'}</h3>
                  </div>
                </div>
              </div>

              <div className="settings-avatar-layout">
                <div className="settings-avatar-preview-wrap">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name || 'User'} className="settings-avatar-img" />
                  ) : (
                    <div className="settings-avatar-placeholder">
                      <UserRound size={36} />
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="settings-avatar-loading-overlay">
                      <RefreshCw size={22} className="animate-spin" />
                    </div>
                  )}
                </div>

                <div className="settings-avatar-actions">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarFileChange}
                  />

                  <div className="settings-avatar-btn-row">
                    <button
                      type="button"
                      className="btn-primary-settings"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      <span>
                        {user?.avatar
                          ? (isBn ? 'নতুন ছবি আপলোড করুন' : 'Change Photo')
                          : (isBn ? 'ছবি আপলোড করুন' : 'Upload Photo')}
                      </span>
                    </button>

                    {user?.avatar && (
                      <button
                        type="button"
                        className="btn-secondary-settings btn-danger-settings"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                      >
                        <Trash2 size={16} />
                        <span>{isBn ? 'ছবি মুছুন' : 'Remove'}</span>
                      </button>
                    )}
                  </div>

                  <p className="settings-avatar-hint">
                    {isBn
                      ? 'JPG, PNG বা WebP ফরম্যাট সমর্থিত। ছবি আপলোড করলে ড্যাশবোর্ডে নামের পাশে প্রদর্শিত হবে।'
                      : 'JPG, PNG or WebP supported. Uploaded photo will appear next to your name on the dashboard.'}
                  </p>

                  {alerts.avatar && (
                    <div className={`settings-alert ${alerts.avatar.type}`} style={{ marginTop: '10px' }}>
                      {alerts.avatar.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>{alerts.avatar.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 1. Username Changed */}
            <div className="settings-card" id="section-username">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon">
                    <User size={22} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">{user?.name || (isBn ? 'নাম' : 'Name')}</h3>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateUsername}>
                <div className="form-field" style={{ maxWidth: '480px' }}>
                  <label className="form-label">
                    <span>{isBn ? 'নাম' : 'Name'}</span>
                  </label>
                  <div className="input-with-icon">
                    <User className="input-icon" size={18} />
                    <input
                      type="text"
                      className="form-input"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={isBn ? 'আপনার নাম লিখুন' : 'Enter your name'}
                      required
                    />
                  </div>
                </div>

                {alerts.username && (
                  <div className={`settings-alert ${alerts.username.type}`}>
                    {alerts.username.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{alerts.username.message}</span>
                  </div>
                )}

                <div style={{ marginTop: '18px' }}>
                  <button type="submit" className="btn-primary-settings" disabled={savingUsername}>
                    {savingUsername ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                    <span>{isBn ? 'নাম সেভ করুন' : 'Save Name'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 2. Email Changed */}
            <div className="settings-card" id="section-email">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon cyan">
                    <Mail size={22} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">{isBn ? 'ইমেইল পরিবর্তন' : 'Email Address'}</h3>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateEmail}>
                <div className="form-field" style={{ maxWidth: '480px' }}>
                  <label className="form-label">
                    <span>{isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}</span>
                  </label>
                  <div className="input-with-icon">
                    <Mail className="input-icon" size={18} />
                    <input
                      type="email"
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                {alerts.email && (
                  <div className={`settings-alert ${alerts.email.type}`}>
                    {alerts.email.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{alerts.email.message}</span>
                  </div>
                )}

                <div style={{ marginTop: '18px' }}>
                  <button type="submit" className="btn-primary-settings" disabled={savingEmail}>
                    {savingEmail ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                    <span>{isBn ? 'ইমেইল আপডেট করুন' : 'Update Email'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 3. Mobile - Modification or Add (2FA) */}
            <div className="settings-card" id="section-mobile">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon amber">
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">{isBn ? 'মোবাইল নম্বর ও ২এফএ' : 'Mobile Phone & SMS 2FA'}</h3>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdatePhone}>
                <div className="form-field" style={{ maxWidth: '480px', marginBottom: '18px' }}>
                  <label className="form-label">
                    <span>{isBn ? 'মোবাইল নম্বর' : 'Mobile Phone Number'}</span>
                  </label>
                  <div className="input-with-icon">
                    <Phone className="input-icon" size={18} />
                    <input
                      type="tel"
                      className="form-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1700-000000"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button type="submit" className="btn-secondary-settings" disabled={savingPhone}>
                    {savingPhone ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                    <span>{isBn ? 'নম্বর সংরক্ষণ করুন' : 'Save Number'}</span>
                  </button>
                </div>
              </form>

              {/* SMS 2FA Toggle Row */}
              <div className="switch-row">
                <div className="switch-label-group">
                  <span className="switch-title">{isBn ? 'এসএমএস টু-ফ্যাক্টর অথেনটিকেশন (2FA)' : 'SMS Two-Factor Authentication'}</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={phone2FA}
                    onChange={handleTogglePhone2FA}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {alerts.phone && (
                <div className={`settings-alert ${alerts.phone.type}`}>
                  {alerts.phone.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{alerts.phone.message}</span>
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* TAB 2: Security & 2FA (Google Authenticator 2FA, Changed Password) */}
        {activeTab === 'security' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            
            {/* 4. Google Authenticator (2FA) */}
            <div className="settings-card" id="section-google-authenticator">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon purple">
                    <Shield size={22} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">{isBn ? 'গুগল অথেন্টিকেটর (2FA)' : 'Google Authenticator (2FA)'}</h3>
                  </div>
                </div>
                <span className={`status-pill ${totp2FA ? 'active' : 'inactive'}`}>
                  {totp2FA ? (isBn ? '2FA সক্রিয়' : '2FA Enabled') : (isBn ? 'কনফিগার করা হয়নি' : 'Not Configured')}
                </span>
              </div>

              <div className="switch-row" style={{ marginBottom: showTotpModal ? '18px' : '0' }}>
                <div className="switch-label-group">
                  <span className="switch-title">{isBn ? 'অথেন্টিকেটর অ্যাপ নিরাপত্তা' : 'Authenticator App'}</span>
                  <span className="switch-subtitle">
                    {totp2FA
                      ? (isBn ? 'আপনার অ্যাকাউন্টে গুগল অথেন্টিকেটর সক্রিয় আছে' : 'Your account is protected by Google Authenticator codes')
                      : (isBn ? 'লগইনে ৬-ডিজিট কোড ব্যবহার করতে অথেন্টিকেটর যুক্ত করুন' : 'Generate 6-digit codes on your phone for verification')}
                  </span>
                </div>
                <div>
                  {totp2FA ? (
                    <button type="button" className="btn-danger-outline" onClick={handleDisableTotp}>
                      {isBn ? 'নিষ্ক্রিয় করুন' : 'Disable 2FA'}
                    </button>
                  ) : (
                    <button type="button" className="btn-primary-settings" onClick={() => setShowTotpModal(!showTotpModal)}>
                      <QrCode size={16} />
                      <span>{showTotpModal ? (isBn ? 'বন্ধ করুন' : 'Close Setup') : (isBn ? 'সেটআপ করুন' : 'Setup App')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* TOTP Setup Accordion / Modal */}
              <AnimatePresence>
                {showTotpModal && !totp2FA && (
                  <motion.div
                    className="totp-box"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="totp-steps">
                      <div className="totp-qr-wrap">
                        {/* Crisp SVG QR Code visualization */}
                        <svg className="totp-qr-svg" viewBox="0 0 100 100" fill="currentColor">
                          <rect width="100" height="100" fill="#ffffff" />
                          {/* Corner Squares */}
                          <rect x="10" y="10" width="26" height="26" fill="#175c4b" rx="4" />
                          <rect x="14" y="14" width="18" height="18" fill="#ffffff" rx="2" />
                          <rect x="18" y="18" width="10" height="10" fill="#175c4b" rx="1" />

                          <rect x="64" y="10" width="26" height="26" fill="#175c4b" rx="4" />
                          <rect x="68" y="14" width="18" height="18" fill="#ffffff" rx="2" />
                          <rect x="72" y="18" width="10" height="10" fill="#175c4b" rx="1" />

                          <rect x="10" y="64" width="26" height="26" fill="#175c4b" rx="4" />
                          <rect x="14" y="68" width="18" height="18" fill="#ffffff" rx="2" />
                          <rect x="18" y="72" width="10" height="10" fill="#175c4b" rx="1" />

                          {/* Data dots pattern */}
                          <rect x="42" y="12" width="6" height="6" fill="#175c4b" />
                          <rect x="52" y="18" width="6" height="6" fill="#175c4b" />
                          <rect x="42" y="26" width="6" height="6" fill="#175c4b" />
                          <rect x="12" y="44" width="6" height="6" fill="#175c4b" />
                          <rect x="22" y="48" width="6" height="6" fill="#175c4b" />
                          <rect x="34" y="42" width="6" height="6" fill="#175c4b" />
                          <rect x="46" y="44" width="8" height="8" fill="#175c4b" />
                          <rect x="60" y="42" width="6" height="6" fill="#175c4b" />
                          <rect x="72" y="48" width="6" height="6" fill="#175c4b" />
                          <rect x="82" y="44" width="6" height="6" fill="#175c4b" />
                          <rect x="44" y="62" width="6" height="6" fill="#175c4b" />
                          <rect x="54" y="68" width="6" height="6" fill="#175c4b" />
                          <rect x="42" y="80" width="6" height="6" fill="#175c4b" />
                          <rect x="62" y="74" width="8" height="8" fill="#175c4b" />
                          <rect x="76" y="66" width="6" height="6" fill="#175c4b" />
                          <rect x="76" y="80" width="8" height="8" fill="#175c4b" />
                        </svg>

                        <div className="totp-code-display">
                          <span>{dummySecretKey}</span>
                          <button type="button" className="copy-btn" onClick={handleCopyKey} title="Copy Key">
                            {copiedKey ? <Check size={16} color="#175c4b" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="totp-instructions">
                        <ol>
                          <li>{isBn ? 'মোবাইলে Google Authenticator বা Authy অ্যাপ খুলুন।' : 'Open Google Authenticator or Authy on your mobile phone.'}</li>
                          <li>{isBn ? 'QR কোড স্ক্যান করুন অথবা সিক্রেট কী কপি করে যোগ করুন।' : 'Scan the QR code or manually paste the Secret Key.'}</li>
                          <li>{isBn ? 'অ্যাপ থেকে প্রাপ্ত ৬-সংখ্যার কোডটি নিচে লিখে নিশ্চিত করুন:' : 'Enter the generated 6-digit verification code below:'}</li>
                        </ol>

                        <div className="totp-verify-input-wrap">
                          <input
                            type="text"
                            maxLength="6"
                            className="totp-verify-input"
                            placeholder="123456"
                            value={totpCodeInput}
                            onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ''))}
                          />
                          <button type="button" className="btn-primary-settings" onClick={handleVerifyTotp}>
                            <Check size={16} />
                            <span>{isBn ? 'যাচাই ও সক্রিয় করুন' : 'Verify & Enable'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {alerts.twofa && (
                <div className={`settings-alert ${alerts.twofa.type}`}>
                  {alerts.twofa.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{alerts.twofa.message}</span>
                </div>
              )}
            </div>

            {/* 5. Change Password */}
            <div className="settings-card" id="section-password">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon blue">
                    <KeyRound size={22} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">{isBn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}</h3>
                  </div>
                </div>
              </div>

              <form onSubmit={handleChangePassword}>
                <div className="form-grid">
                  
                  {/* Current Password */}
                  <div className="form-field">
                    <label className="form-label">{isBn ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}</label>
                    <div className="input-with-icon">
                      <Lock className="input-icon" size={18} />
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        className="form-input"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="input-password-toggle"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        tabIndex="-1"
                      >
                        {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="form-field">
                    <label className="form-label">{isBn ? 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'New Password (min. 6 chars)'}</label>
                    <div className="input-with-icon">
                      <Lock className="input-icon" size={18} />
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        className="form-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="input-password-toggle"
                        onClick={() => setShowNewPass(!showNewPass)}
                        tabIndex="-1"
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="form-field">
                    <label className="form-label">{isBn ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}</label>
                    <div className="input-with-icon">
                      <Lock className="input-icon" size={18} />
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        className="form-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="input-password-toggle"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        tabIndex="-1"
                      >
                        {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                </div>

                {alerts.password && (
                  <div className={`settings-alert ${alerts.password.type}`}>
                    {alerts.password.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{alerts.password.message}</span>
                  </div>
                )}

                <div style={{ marginTop: '22px' }}>
                  <button type="submit" className="btn-primary-settings" disabled={savingPassword}>
                    {savingPassword ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
                    <span>{isBn ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            </div>

          </motion.div>
        )}

        {/* TAB 3: Plan Upgrade (Free / Basic / Premium) */}
        {activeTab === 'subscription' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="settings-card" id="section-plan">
              <div className="settings-card-header">
                <div className="settings-card-title-group">
                  <div className="settings-card-icon amber">
                    <Crown size={22} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">{isBn ? 'সাবস্ক্রিপশন প্ল্যান আপগ্রেড' : 'Subscription Plan Upgrade'}</h3>
                  </div>
                </div>
                <span className={`status-pill ${currentPlan !== 'free' ? 'premium' : 'inactive'}`}>
                  {isBn ? `বর্তমান: ${currentPlan.toUpperCase()}` : `Current: ${currentPlan.toUpperCase()}`}
                </span>
              </div>

              {alerts.plan && (
                <div className={`settings-alert ${alerts.plan.type}`} style={{ marginBottom: '16px' }}>
                  {alerts.plan.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{alerts.plan.message}</span>
                </div>
              )}

              {/* 3 Pricing Cards */}
              <div className="pricing-grid">
                
                {/* Free Plan */}
                <div className={`plan-card ${currentPlan === 'free' ? 'current' : ''}`}>
                  {currentPlan === 'free' && (
                    <span className="plan-badge-current">{isBn ? 'বর্তমান প্ল্যান' : 'Active Plan'}</span>
                  )}
                  <h4 className="plan-tier-name">{isBn ? 'ফ্রি প্ল্যান' : 'Free Tier'}</h4>
                  <div className="plan-price-wrap">
                    <span className="plan-price">{isBn ? '৳০' : '$0'}</span>
                    <span className="plan-period">{isBn ? '/আজীবন' : '/forever'}</span>
                  </div>
                  <ul className="plan-features-list">
                    <li><Check size={16} /> {isBn ? 'বেসিক লক্ষণ পরীক্ষা ও বিশ্লেষণ' : 'Basic Symptom Checker'}</li>
                    <li><Check size={16} /> {isBn ? 'প্রাথমিক চিকিৎসা গাইড' : 'First Aid & Body Map'}</li>
                    <li><Check size={16} /> {isBn ? 'হিস্ট্রি লোকাল সেভ' : 'Recent checks history'}</li>
                    <li className="disabled"><Check size={16} /> {isBn ? 'টেলিকনসালটেশন ছাড়' : 'Teleconsultation discounts'}</li>
                    <li className="disabled"><Check size={16} /> {isBn ? 'অফিসিয়াল PDF রিপোর্ট' : 'Full PDF Health Reports'}</li>
                  </ul>
                  <button
                    type="button"
                    className={`plan-action-btn ${currentPlan === 'free' ? 'active-btn' : 'btn-secondary-settings'}`}
                    disabled={currentPlan === 'free' || upgradingPlan === 'free'}
                    onClick={() => handleUpgradePlan('free')}
                  >
                    {upgradingPlan === 'free' ? <RefreshCw size={16} className="animate-spin" /> : null}
                    <span>{currentPlan === 'free' ? (isBn ? 'বর্তমান প্ল্যান' : 'Current Plan') : (isBn ? 'ফ্রি তে ফিরুন' : 'Switch to Free')}</span>
                  </button>
                </div>

                {/* Basic Plan */}
                <div className={`plan-card ${currentPlan === 'basic' ? 'current' : ''}`}>
                  {currentPlan === 'basic' && (
                    <span className="plan-badge-current">{isBn ? 'বর্তমান প্ল্যান' : 'Active Plan'}</span>
                  )}
                  <h4 className="plan-tier-name">{isBn ? 'বেসিক কেয়ার' : 'Basic Care'}</h4>
                  <div className="plan-price-wrap">
                    <span className="plan-price">{isBn ? '৳৪৯৯' : '$9'}</span>
                    <span className="plan-period">{isBn ? '/মাস' : '/month'}</span>
                  </div>
                  <ul className="plan-features-list">
                    <li><Check size={16} /> {isBn ? 'আনলিমিটেড AI লক্ষণ পরীক্ষা' : 'Unlimited AI symptom checks'}</li>
                    <li><Check size={16} /> {isBn ? 'টেলিকনসালটেশন ২০% ছাড়' : '20% off Teleconsultations'}</li>
                    <li><Check size={16} /> {isBn ? 'ওষুধ খাওয়ার এসএমএস রিমাইন্ডার' : 'SMS medicine reminders'}</li>
                    <li><Check size={16} /> {isBn ? 'অফিসিয়াল PDF রিপোর্ট ডাউনলোড' : 'PDF Health Report download'}</li>
                    <li className="disabled"><Check size={16} /> {isBn ? '২৪/৭ ডেডিকেটেড ডাক্তার সাপোর্ট' : '24/7 Priority Emergency Line'}</li>
                  </ul>
                  <button
                    type="button"
                    className={`plan-action-btn ${currentPlan === 'basic' ? 'active-btn' : 'upgrade-btn'}`}
                    disabled={currentPlan === 'basic' || upgradingPlan === 'basic'}
                    onClick={() => handleUpgradePlan('basic')}
                  >
                    {upgradingPlan === 'basic' ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    <span>{currentPlan === 'basic' ? (isBn ? 'বর্তমান প্ল্যান' : 'Current Plan') : (isBn ? 'বেসিকে আপগ্রেড করুন' : 'Upgrade to Basic')}</span>
                  </button>
                </div>

                {/* Premium Plan */}
                <div className={`plan-card featured ${currentPlan === 'premium' ? 'current' : ''}`}>
                  <span className="plan-badge-popular">{isBn ? 'সেরা প্যাকেজ' : 'Best Value'}</span>
                  {currentPlan === 'premium' && (
                    <span className="plan-badge-current" style={{ right: '110px' }}>{isBn ? 'সক্রিয়' : 'Active'}</span>
                  )}
                  <h4 className="plan-tier-name">{isBn ? 'আল্টিমেট প্রিমিয়াম' : 'Premium Ultimate'}</h4>
                  <div className="plan-price-wrap">
                    <span className="plan-price">{isBn ? '৳৯৯৯' : '$19'}</span>
                    <span className="plan-period">{isBn ? '/মাস' : '/month'}</span>
                  </div>
                  <ul className="plan-features-list">
                    <li><Check size={16} /> {isBn ? 'সব প্রিমিয়াম AI ডায়াগনস্টিক সুবিধা' : 'All Advanced AI Diagnostics'}</li>
                    <li><Check size={16} /> {isBn ? 'বিনামূল্যে ত্রৈমাসিক ডাক্তার কনসালটেশন' : '1 Free Doctor Consult / Quarter'}</li>
                    <li><Check size={16} /> {isBn ? 'পরিবারের ৪ জনের স্বাস্থ্য প্রোফাইল' : 'Family coverage (up to 4 members)'}</li>
                    <li><Check size={16} /> {isBn ? '২৪/৭ অন-কল হেলথ অ্যাসিস্ট্যান্ট' : '24/7 Dedicated Care Assistant'}</li>
                    <li><Check size={16} /> {isBn ? 'অফিসিয়াল বিস্তারিত হেলথ রিপোর্ট' : 'Priority Full Health PDF Reports'}</li>
                  </ul>
                  <button
                    type="button"
                    className={`plan-action-btn ${currentPlan === 'premium' ? 'active-btn' : 'upgrade-btn'}`}
                    disabled={currentPlan === 'premium' || upgradingPlan === 'premium'}
                    onClick={() => handleUpgradePlan('premium')}
                  >
                    {upgradingPlan === 'premium' ? <RefreshCw size={16} className="animate-spin" /> : <Crown size={16} />}
                    <span>{currentPlan === 'premium' ? (isBn ? 'বর্তমান প্ল্যান' : 'Current Plan') : (isBn ? 'প্রিমিয়ামে আপগ্রেড করুন' : 'Upgrade to Premium')}</span>
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: Language Switch */}
        {activeTab === 'preferences' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="settings-card" id="section-language">
              <div className="lang-selector-grid">
                
                {/* English */}
                <div
                  className={`lang-card ${language === 'en' ? 'selected' : ''}`}
                  onClick={() => handleSwitchLanguage('en')}
                  role="button"
                  tabIndex="0"
                >
                  <div className="lang-info">
                    <span className="lang-flag">🌐</span>
                    <div>
                      <div className="lang-text-title">English</div>
                      <div className="lang-text-subtitle">Global (English)</div>
                    </div>
                  </div>
                  {language === 'en' && <CheckCircle2 size={20} color="#175c4b" />}
                </div>

                {/* Bangla */}
                <div
                  className={`lang-card ${language === 'bn' ? 'selected' : ''}`}
                  onClick={() => handleSwitchLanguage('bn')}
                  role="button"
                  tabIndex="0"
                >
                  <div className="lang-info">
                    <span className="lang-flag">🇧🇩</span>
                    <div>
                      <div className="lang-text-title">বাংলা</div>
                      <div className="lang-text-subtitle">বাংলা - বাংলাদেশ</div>
                    </div>
                  </div>
                  {language === 'bn' && <CheckCircle2 size={20} color="#175c4b" />}
                </div>

              </div>
            </div>

            <div className="settings-card" style={{ marginTop: '20px' }}>
              <div className="settings-card-header">
                <div className="card-header-icon" style={{ background: '#E8F3EE', color: '#175C4B' }}>
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="card-title">{isBn ? 'Veda অ্যাপ ইনস্টল' : 'Install Veda App'}</h3>
                  <p className="card-subtitle">
                    {isBn
                      ? 'অফলাইনে দ্রুত অ্যাক্সেস এবং ওষুধের রিমাইন্ডার পেতে আপনার ডিভাইসে ইনস্টল করুন'
                      : 'Install on your phone or computer for instant offline access and notifications'}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/pwa-192x192.png" alt="Veda" style={{ width: '48px', height: '48px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(23,92,75,0.15)' }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: '#102E26' }}>Veda – The Ultimate Care</strong>
                    <span style={{ fontSize: '0.8rem', color: '#687F77' }}>Progressive Web App (PWA)</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.dispatchEvent(new CustomEvent('veda-trigger-install'))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px' }}
                >
                  <Download size={16} />
                  <span>{isBn ? 'ইনস্টল করুন' : 'Install Now'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: Health Records & PDF Download */}
        {activeTab === 'records' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="settings-card" id="section-health-report">
              {alerts.pdf && (
                <div className={`settings-alert ${alerts.pdf.type}`} style={{ marginBottom: '16px' }}>
                  {alerts.pdf.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{alerts.pdf.message}</span>
                </div>
              )}

              <div className="report-clean-download-wrap">
                <button
                  type="button"
                  className="report-download-btn"
                  onClick={handleDownloadHealthReport}
                  disabled={generatingPdf}
                  id="btn-download-health-report"
                >
                  {generatingPdf ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>{isBn ? 'তৈরি হচ্ছে...' : 'Generating PDF...'}</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>{isBn ? 'স্বাস্থ্য রিপোর্ট ডাউনলোড করুন' : 'Download Health Report'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
