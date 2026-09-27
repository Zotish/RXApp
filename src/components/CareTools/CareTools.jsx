import { useState } from 'react';
import { Droplets, Thermometer } from 'lucide-react';
import { t } from '../../i18n/translations';
import './CareTools.css';

const ORS_AGES = [
  { id: 'under2', en: 'Under 2 years', bn: '২ বছরের নিচে', amountEn: '50–100 ml after each loose stool', amountBn: 'প্রতিবার পাতলা পায়খানার পর ৫০–১০০ মিলি' },
  { id: 'child', en: '2–10 years', bn: '২–১০ বছর', amountEn: '100–200 ml after each loose stool', amountBn: 'প্রতিবার পাতলা পায়খানার পর ১০০–২০০ মিলি' },
  { id: 'older', en: '10 years and older', bn: '১০ বছর+', amountEn: 'As much as wanted — at least a full glass', amountBn: 'যত খেতে চায় — অন্তত এক গ্লাস' },
];

export default function CareTools({ language = 'en' }) {
  const [orsAge, setOrsAge] = useState('child');
  const selected = ORS_AGES.find((a) => a.id === orsAge) || ORS_AGES[1];
  const L = (key) => t(key, language);
  const bn = language === 'bn';

  return (
    <section className="care-tools" id="care-tools">
      <div className="care-tools-header">
        <span className="section-label">{L('careToolsLabel')}</span>
        <h2 className="care-tools-title">{L('careToolsTitle')}</h2>
        <p className="care-tools-desc">{L('careToolsDesc')}</p>
      </div>

      <div className="care-tools-grid">
        <article className="care-card">
          <div className="care-card-icon"><Droplets size={20} /></div>
          <h3>{L('orsTitle')}</h3>
          <ol className="care-steps">
            <li>{L('orsMix1')}</li>
            <li>{L('orsMix2')}</li>
            <li>{L('orsMix3')}</li>
          </ol>
          <div className="ors-ages" role="group" aria-label={L('orsTitle')}>
            {ORS_AGES.map((age) => (
              <button
                key={age.id}
                type="button"
                className={`ors-age-btn ${orsAge === age.id ? 'selected' : ''}`}
                onClick={() => setOrsAge(age.id)}
              >
                {bn ? age.bn : age.en}
              </button>
            ))}
          </div>
          <p className="ors-amount">{bn ? selected.amountBn : selected.amountEn}</p>
          <p className="care-warn">{L('orsDanger')}</p>
        </article>

        <article className="care-card">
          <div className="care-card-icon fever"><Thermometer size={20} /></div>
          <h3>{L('feverTitle')}</h3>
          <ul className="care-steps fever-list">
            <li>{L('feverTip1')}</li>
            <li>{L('feverTip2')}</li>
            <li>{L('feverTip3')}</li>
          </ul>
          <p className="care-warn">{L('feverDanger')}</p>
        </article>
      </div>
    </section>
  );
}
