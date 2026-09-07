import { Link } from 'react-router-dom';
import ConsentSettings from '../components/ConsentSettings';
import {
  IconShield,
  IconUser,
  IconLock,
  IconSliders,
  IconTrash,
} from '../components/Icons';
import './privacy.css';

const VALUES = [
  { icon: IconShield, title: 'Protection', text: 'Vos données sont sécurisées et traitées avec la plus grande confidentialité.' },
  { icon: IconUser, title: 'Transparence', text: "Nous vous informons clairement sur l'utilisation de vos données." },
  { icon: IconLock, title: 'Sécurité', text: 'Nous mettons en place des mesures techniques et organisationnelles adaptées.' },
  { icon: IconSliders, title: 'Contrôle', text: 'Vous gardez le contrôle sur vos données et vos préférences.' },
  { icon: IconTrash, title: 'Respect', text: 'Nous respectons les lois en vigueur sur la protection des données, notamment au Bénin.' },
];

const SECTIONS = [
  { id: 'donnees-collectees', title: 'Données collectées' },
  { id: 'utilisation-donnees', title: 'Utilisation des données' },
  { id: 'partage-donnees', title: 'Partage des données' },
  { id: 'cookies', title: 'Cookies et technologies similaires' },
  { id: 'duree-conservation', title: 'Durée de conservation' },
  { id: 'vos-droits', title: 'Vos droits' },
  { id: 'securite-donnees', title: 'Sécurité des données' },
  { id: 'modifications', title: 'Modifications de la politique' },
  { id: 'nous-contacter', title: 'Nous contacter' },
];

export default function Privacy() {
  return (
    <div className="privacy-page">
      <section className="privacy-hero">
        <div className="privacy-hero__overlay" />
        <div className="container privacy-hero__content">
          <nav className="privacy-breadcrumb" aria-label="Fil d'Ariane">
            <Link to="/">Accueil</Link>
            <span>›</span>
            <span className="privacy-breadcrumb__current">Politique de confidentialité</span>
          </nav>
          <h1>POLITIQUE DE CONFIDENTIALITÉ</h1>
          <span className="privacy-hero__rule" />
          <p>
            Chez CORTEX BÉNIN TV, la protection de vos données personnelles est une priorité.
            Cette politique explique comment nous collectons, utilisons et protégeons vos
            informations.
          </p>
        </div>
      </section>

      <section className="container privacy-values">
        {VALUES.map(({ icon: Icon, title, text }) => (
          <div className="privacy-value" key={title}>
            <span className="privacy-value__icon"><Icon /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>

      <div className="container privacy-layout">
        <aside className="privacy-toc">
          <h2>Sommaire</h2>
          <span className="privacy-toc__rule" />
          <ul>
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{i + 1}. {s.title}</a>
              </li>
            ))}
          </ul>
        </aside>

        <div className="privacy-content">
          <section id="donnees-collectees" className="privacy-section">
            <span className="privacy-section__num">1</span>
            <div>
              <h2>Données collectées</h2>
              <p>Nous pouvons collecter les informations suivantes :</p>
              <ul>
                <li>Informations que vous nous fournissez directement (nom, email, téléphone, message, etc.)</li>
                <li>Informations collectées automatiquement lors de votre navigation (pages visitées, type de navigateur, etc.)</li>
                <li>Données issues des cookies et technologies similaires.</li>
              </ul>
            </div>
          </section>

          <section id="utilisation-donnees" className="privacy-section">
            <span className="privacy-section__num">2</span>
            <div>
              <h2>Utilisation des données</h2>
              <p>Vos données sont utilisées pour :</p>
              <ul>
                <li>Vous fournir nos services et contenus</li>
                <li>Répondre à vos demandes et communiquer avec vous</li>
                <li>Améliorer votre expérience utilisateur</li>
                <li>Vous envoyer notre newsletter, avec votre consentement</li>
              </ul>
            </div>
          </section>

          <section id="partage-donnees" className="privacy-section">
            <span className="privacy-section__num">3</span>
            <div>
              <h2>Partage des données</h2>
              <p>Nous ne vendons ni ne louons vos données personnelles.</p>
              <p>Vos données peuvent être partagées uniquement avec :</p>
              <ul>
                <li>Nos partenaires techniques (hébergement, outils d'analyse, etc.)</li>
                <li>Les autorités compétentes lorsque la loi l'exige.</li>
              </ul>
            </div>
          </section>

          <section id="cookies" className="privacy-section">
            <span className="privacy-section__num">4</span>
            <div>
              <h2>Cookies et technologies similaires</h2>
              <p>
                Notre site utilise des cookies pour améliorer votre expérience, mesurer
                l'audience et personnaliser les contenus. Vous pouvez gérer vos préférences
                ci-dessous.
              </p>
              <div className="privacy-consent-box">
                <ConsentSettings />
              </div>
            </div>
          </section>

          <section id="duree-conservation" className="privacy-section">
            <span className="privacy-section__num">5</span>
            <div>
              <h2>Durée de conservation</h2>
              <p>
                Nous conservons vos données uniquement pendant la durée nécessaire aux finalités
                pour lesquelles elles ont été collectées, ou conformément aux obligations légales.
              </p>
            </div>
          </section>

          <section id="vos-droits" className="privacy-section">
            <span className="privacy-section__num">6</span>
            <div>
              <h2>Vos droits</h2>
              <p>
                Vous disposez d'un droit d'accès, de rectification et de suppression de vos
                données. Pour vous désinscrire de la newsletter, utilisez notre{' '}
                <Link to="/desabonnement">page de désabonnement</Link>. Pour toute autre demande,
                contactez-nous à{' '}
                <a href="mailto:cortexbenin@gmail.com">cortexbenin@gmail.com</a>.
              </p>
            </div>
          </section>

          <section id="securite-donnees" className="privacy-section">
            <span className="privacy-section__num">7</span>
            <div>
              <h2>Sécurité des données</h2>
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables
                pour protéger vos données contre l'accès non autorisé, la perte ou l'altération.
              </p>
            </div>
          </section>

          <section id="modifications" className="privacy-section">
            <span className="privacy-section__num">8</span>
            <div>
              <h2>Modifications de la politique</h2>
              <p>
                Cette politique peut être mise à jour périodiquement. La date de dernière mise à
                jour est indiquée en bas de cette page.
              </p>
            </div>
          </section>

          <section id="nous-contacter" className="privacy-section privacy-section--last">
            <span className="privacy-section__num">9</span>
            <div>
              <h2>Nous contacter</h2>
              <p>
                Pour toute question relative à cette politique, écrivez-nous à{' '}
                <a href="mailto:cortexbenin@gmail.com">cortexbenin@gmail.com</a>.
              </p>
            </div>
          </section>

          <div className="privacy-cta">
            <span className="privacy-cta__icon"><IconShield /></span>
            <div className="privacy-cta__text">
              <h3>Votre vie privée est importante pour nous</h3>
              <p>Nous nous engageons à protéger vos données et à respecter votre vie privée.</p>
            </div>
            <Link to="/contact" className="privacy-cta__btn">Nous contacter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
