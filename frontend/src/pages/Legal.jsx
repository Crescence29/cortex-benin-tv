import { Link } from 'react-router-dom';
import {
  IconDoc,
  IconServer,
  IconCopyright,
  IconShield,
  IconUser,
  IconCookie,
  IconScale,
  IconMail,
} from '../components/Icons';
import './legal.css';

const SECTIONS = [
  {
    icon: IconDoc,
    title: '1. Éditeur du site',
    body: (
      <>
        <p>Ce site est édité par :</p>
        <p className="legal-highlight">CORTEX BÉNIN TV</p>
        <p>
          Média audiovisuel et de communication
          <br />
          Siège social : Cotonou, République du Bénin
          <br />
          Téléphone : <a href="tel:+2290199151818">(+229) 01 99 15 18 18</a> / <a href="tel:+2290197656065">01 97 65 60 65</a> / <a href="tel:+2290197393735">01 97 39 37 35</a>
          <br />
          Email : <a href="mailto:cortexbenin@gmail.com">cortexbenin@gmail.com</a>
          <br />
          Directeur de la publication : Mr Gabin HOUNKPATIN, Directeur Général
          <br />
          Numéro RCCM : RB/COT/17 A 31302
          <br />
          Numéro IFU : 1201701720506
        </p>
      </>
    ),
  },
  {
    icon: IconServer,
    title: '2. Hébergement',
    body: (
      <p>
        Le nom, l'adresse et le contact de l'hébergeur seront précisés ici selon le prestataire
        retenu pour la mise en production du site.
      </p>
    ),
  },
  {
    icon: IconCopyright,
    title: '3. Propriété intellectuelle',
    body: (
      <>
        <p>
          L'ensemble de ce site relève des législations béninoise et internationale sur le droit
          d'auteur et la propriété intellectuelle.
        </p>
        <p>
          Tous les contenus présents sur ce site (textes, images, vidéos, logos, icônes,
          graphismes, sons, logiciels…) sont la propriété exclusive de CORTEX BÉNIN TV, sauf
          mention contraire.
        </p>
        <p>
          Toute reproduction, représentation, modification, publication, adaptation de tout ou
          partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite
          sans l'autorisation écrite préalable de CORTEX BÉNIN TV.
        </p>
      </>
    ),
  },
  {
    icon: IconShield,
    title: '4. Responsabilités',
    body: (
      <>
        <p>CORTEX BÉNIN TV s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site.</p>
        <p>Toutefois, des erreurs ou omissions peuvent survenir.</p>
        <p>L'utilisateur reconnaît utiliser ces informations sous sa responsabilité exclusive.</p>
        <p>Le site peut contenir des liens vers d'autres sites. CORTEX BÉNIN TV décline toute responsabilité quant au contenu de ces sites externes.</p>
      </>
    ),
  },
  {
    icon: IconUser,
    title: '5. Données personnelles',
    body: (
      <p>
        Les données personnelles collectées via les formulaires du site sont traitées
        conformément à la réglementation béninoise relative à la protection des données à
        caractère personnel. Pour plus d'informations, consultez notre{' '}
        <Link to="/confidentialite">Politique de confidentialité</Link>.
      </p>
    ),
  },
  {
    icon: IconCookie,
    title: '6. Cookies',
    body: (
      <>
        <p>Le site utilise des cookies pour améliorer l'expérience utilisateur, analyser la fréquentation et personnaliser les contenus.</p>
        <p>En poursuivant votre navigation, vous acceptez l'utilisation de cookies.</p>
        <p>Vous pouvez à tout moment modifier vos préférences via les paramètres de votre navigateur ou depuis le menu Réglages du site.</p>
      </>
    ),
  },
  {
    icon: IconScale,
    title: '7. Droit applicable',
    body: (
      <>
        <p>Les présentes mentions légales sont régies par le droit béninois.</p>
        <p>En cas de litige, et après échec d'une tentative de résolution amiable, les tribunaux compétents de Cotonou seront seuls habilités.</p>
      </>
    ),
  },
];

export default function Legal() {
  return (
    <div className="legal-page">
      <section className="legal-hero">
        <div className="legal-hero__overlay" />
        <div className="container legal-hero__content">
          <h1>MENTIONS LÉGALES</h1>
          <p>Informations légales et conditions d'utilisation</p>
          <span className="legal-hero__rule" />
          <nav className="legal-breadcrumb" aria-label="Fil d'Ariane">
            <Link to="/">Accueil</Link>
            <span>›</span>
            <span className="legal-breadcrumb__current">Mentions légales</span>
          </nav>
        </div>
      </section>

      <div className="container legal-body">
        <div className="legal-grid">
          {SECTIONS.map(({ icon: Icon, title, body }) => (
            <div className="legal-section" key={title}>
              <span className="legal-section__icon"><Icon /></span>
              <div>
                <h2>{title}</h2>
                {body}
              </div>
            </div>
          ))}

          <div className="legal-contact-card">
            <span className="legal-contact-card__icon"><IconMail /></span>
            <h3>Nous contacter</h3>
            <p>Pour toute question relative aux mentions légales, vous pouvez nous écrire à :</p>
            <a href="mailto:cortexbenin@gmail.com">cortexbenin@gmail.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}
