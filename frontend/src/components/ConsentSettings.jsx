import { useState } from 'react';

export default function ConsentSettings() {
  const [analytics, setAnalytics] = useState(() => localStorage.getItem('cortex_consent_analytics') !== 'false');

  function toggleAnalytics() {
    const next = !analytics;
    setAnalytics(next);
    localStorage.setItem('cortex_consent_analytics', String(next));
  }

  return (
    <div className="settings-panel__form">
      <label className="settings-panel__toggle-row">
        <span>Cookies essentiels (nécessaires au fonctionnement)</span>
        <input type="checkbox" checked disabled />
      </label>
      <label className="settings-panel__toggle-row">
        <span>Mesure d'audience</span>
        <input type="checkbox" checked={analytics} onChange={toggleAnalytics} />
      </label>
      <p className="settings-panel__hint">Ce choix est mémorisé sur cet appareil.</p>
    </div>
  );
}
