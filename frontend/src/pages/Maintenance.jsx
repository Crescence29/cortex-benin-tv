import Logo from '../components/Logo';
import './maintenance.css';

export default function Maintenance({ message }) {
  return (
    <div className="maintenance-page">
      <div className="maintenance-page__card">
        <Logo imgAlt="Cortex Bénin TV" textClassName="brand-text-logo" />
        <h1>Site en maintenance</h1>
        <p>{message || "Le site est momentanément indisponible pour maintenance. Merci de revenir un peu plus tard."}</p>
      </div>
    </div>
  );
}
