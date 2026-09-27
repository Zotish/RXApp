import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Languages, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import './About.css';

export default function About({ language = 'en' }) {
  const navigate = useNavigate();
  const bn = language === 'bn';

  const copy = bn ? {
    eyebrow: 'আমাদের সম্পর্কে',
    title: 'স্বাস্থ্যসেবা বোঝা সহজ হওয়া উচিত।',
    intro: 'Veda সাধারণ স্বাস্থ্যগত উদ্বেগ বুঝতে এবং নিরাপদ পরবর্তী পদক্ষেপ বেছে নিতে সাহায্য করে—বাংলা ও ইংরেজিতে।',
    values: [
      { icon: Sparkles, title: 'সহজ', desc: 'জটিল শব্দ নয়, পরিষ্কার ও ব্যবহারযোগ্য নির্দেশনা।' },
      { icon: LockKeyhole, title: 'ব্যক্তিগত', desc: 'আপনার স্বাস্থ্যতথ্যের নিয়ন্ত্রণ আপনার কাছেই থাকে।' },
      { icon: Languages, title: 'দ্বিভাষিক', desc: 'বাংলা ও ইংরেজিতে স্বাভাবিকভাবে ব্যবহার করুন।' },
      { icon: ShieldCheck, title: 'দায়িত্বশীল', desc: 'নির্দেশনা দেয়, কিন্তু চিকিৎসকের বিকল্প হওয়ার দাবি করে না।' },
    ],
    whyTitle: 'কেন Veda',
    whyText: 'স্বাস্থ্য নিয়ে অনিশ্চয়তার মুহূর্তে প্রথম প্রশ্নটি সহজ: এখন কী করা উচিত? Veda সেই সিদ্ধান্তকে পরিষ্কার করে—লক্ষণ পরীক্ষা, প্রাথমিক চিকিৎসা, কাছের হাসপাতাল এবং অনলাইন পরামর্শকে এক জায়গায় এনে।',
    safetyTitle: 'একটি গুরুত্বপূর্ণ সীমা',
    safetyText: 'Veda তথ্য ও প্রাথমিক নির্দেশনার জন্য। জরুরি, গুরুতর বা দীর্ঘস্থায়ী সমস্যায় নিবন্ধিত চিকিৎসকের সহায়তা নিন।',
    ctaTitle: 'একটি পরিষ্কার পদক্ষেপ দিয়ে শুরু করুন',
    ctaText: 'আপনার লক্ষণ লিখুন এবং প্রাসঙ্গিক নির্দেশনা দেখুন।',
    cta: 'লক্ষণ পরীক্ষা করুন',
  } : {
    eyebrow: 'About us',
    title: 'Healthcare should be easier to understand.',
    intro: 'Veda helps people make sense of common health concerns and choose a safer next step—in Bangla or English.',
    values: [
      { icon: Sparkles, title: 'Clear', desc: 'Practical guidance without complicated language.' },
      { icon: LockKeyhole, title: 'Private', desc: 'You stay in control of your health information.' },
      { icon: Languages, title: 'Bilingual', desc: 'Use Veda naturally in Bangla or English.' },
      { icon: ShieldCheck, title: 'Responsible', desc: 'Guidance that never pretends to replace a clinician.' },
    ],
    whyTitle: 'Why Veda exists',
    whyText: 'In an uncertain health moment, the first question is simple: what should I do next? Veda makes that decision clearer by bringing symptom guidance, first aid, nearby hospitals, and consultations into one calm experience.',
    safetyTitle: 'An important boundary',
    safetyText: 'Veda is for information and early guidance. For urgent, serious, or persistent concerns, seek help from a licensed healthcare professional.',
    ctaTitle: 'Start with one clear step',
    ctaText: 'Describe your symptoms and see relevant guidance.',
    cta: 'Check symptoms',
  };

  return (
    <main className="about-page" id="about-page">
      <div className="about-container">
        <motion.header
          className="about-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .42 }}
        >
          <h1 className="about-hero-title">{copy.eyebrow}</h1>
        </motion.header>

        <section className="mission-grid" aria-label={bn ? 'আমাদের মূলনীতি' : 'Our principles'}>
          {copy.values.map(({ title, desc }, index) => (
            <motion.article
              key={title}
              className="mission-card"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * .05 }}
            >
              <h2 className="mission-title">{title}</h2>
              <p className="mission-desc">{desc}</p>
            </motion.article>
          ))}
        </section>

        <section className="about-section">
          <h2 className="about-section-title">{copy.whyTitle}</h2>
          <p>{copy.whyText}</p>
        </section>

        <section className="about-section">
          <h2 className="about-section-title"><ShieldCheck size={20} />{copy.safetyTitle}</h2>
          <p>{copy.safetyText}</p>
        </section>

        <section className="about-cta" id="about-cta">
          <h2>{copy.ctaTitle}</h2>
          <p>{copy.ctaText}</p>
          <button className="hero-btn-primary" onClick={() => navigate('/symptom-checker')} id="about-try-now">
            {copy.cta}<ArrowRight size={18} />
          </button>
        </section>
      </div>
    </main>
  );
}
