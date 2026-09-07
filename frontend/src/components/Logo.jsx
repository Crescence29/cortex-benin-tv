import { useEffect, useState } from 'react';
import { getLogoState, subscribeLogo, ensureLogoLoaded } from '../logoStore';

// Logo utilisé partout dans l'app (navbar, footer...) — bascule entre l'image
// et un texte de marque stylisé selon le réglage géré dans l'onglet développeur.
export default function Logo({ imgClassName, textClassName, imgAlt = 'Cortex Bénin TV' }) {
  const [state, setState] = useState(getLogoState());

  useEffect(() => {
    ensureLogoLoaded();
    return subscribeLogo(setState);
  }, []);

  if (state.logo_mode === 'text') {
    return <span className={`brand-text-logo ${textClassName || ''}`}>{state.logo_text || 'CORTEX BÉNIN TV'}</span>;
  }

  return <img src="/logo.png" alt={imgAlt} className={imgClassName} />;
}
