import { Link } from "react-router-dom";
import TeamGrid from "../components/TeamGrid";
import {
  IconPlay,
  IconDoc,
  IconSearch,
  IconCamera,
  IconBulb,
  IconTv,
  IconMic,
  IconVideo,
  IconSmartphone,
  IconShield,
  IconTarget,
  IconFlag,
  IconUsers,
  IconRocket,
  IconFacebook,
  IconYoutube,
  IconTikTok,
} from "../components/Icons";
import "./about.css";

const MISSION = [
  {
    icon: IconDoc,
    title: "Informer",
    text: "Apporter une information fiable, vérifiée et accessible à tous, partout.",
  },
  {
    icon: IconSearch,
    title: "Analyser",
    text: "Donner du contexte et éclairer les faits pour mieux comprendre le monde.",
  },
  {
    icon: IconCamera,
    title: "Raconter",
    text: "Mettre l'humain au cœur de nos reportages et donner la parole à ceux qui font l'actualité.",
  },
  {
    icon: IconBulb,
    title: "Innover",
    text: "Utiliser les nouvelles technologies pour proposer des formats créatifs et immersifs.",
  },
];

const ACTIVITIES = [
  {
    icon: IconTv,
    title: "Télévision",
    text: "Des programmes d'information, des magazines, des débats et des documentaires.",
  },
  {
    icon: IconMic,
    title: "Radio",
    text: "Des émissions interactives, des chroniques et de la musique pour tous.",
  },
  {
    icon: IconVideo,
    title: "Production",
    text: "Reportages, films, captations et contenus institutionnels sur mesure.",
  },
  {
    icon: IconSmartphone,
    title: "Digital",
    text: "Site web, réseaux sociaux, applications et conception de solutions numériques sur mesure.",
  },
];

const VALUES = [
  {
    icon: IconShield,
    title: "Intégrité",
    text: "Nous agissons avec honnêteté et responsabilité.",
  },
  {
    icon: IconTarget,
    title: "Rigueur",
    text: "Nous vérifions nos sources et nos informations.",
  },
  {
    icon: IconFlag,
    title: "Indépendance",
    text: "Nous restons libres et impartiaux.",
  },
  {
    icon: IconUsers,
    title: "Proximité",
    text: "Nous sommes à l'écoute de notre communauté.",
  },
  {
    icon: IconRocket,
    title: "Innovation",
    text: "Nous expérimentons et évoluons sans cesse.",
  },
];

const TEAM_MEMBERS = [
  {
    img: "/equipe/SA.jpg",
    name: "HOUNSOUNOU Carnis",
    role: "Secrétaire Administrative",
    fonction: "Secrétaire / Assistante",
    desc: "Organisation, coordination et accompagnement au quotidien.",
  },
  {
    img: "/equipe/Vidéase.jpg",
    name: "Chédrac",
    role: "Monteur",
    fonction: "Montage vidéo",
    desc: "Donne vie aux idées à travers des montages vidéo créatifs et percutants.",
  },
  {
    img: "/equipe/Développeur 1.jpg",
    name: "KOUCHANOU Crescence",
    role: "Développeur full stack",
    fonction: "Développement Web/ Application",
    desc: "Conçoit des solutions numérique et visuel modernes, performantes et adaptées aux besoins.",
  },
  {
    img: "/equipe/Graphiste.jpg",
    name: "AKAKPOVIE Christian",
    role: "Graphiste Designer ",
    fonction: "Design & Création",
    desc: "Transforme les idées en visuels créatifs, élégants et mémorables.",
  },
  {
    img: "/equipe/Développeur 2.jpg",
    name: "KUISSODE Hubert Joseph",
    role: "Développeur full stack",
    fonction: "Applications & Systèmes",
    desc: "Développe des applications intuitives et des expériences numériques efficaces.",
  },
  {
    img: "/equipe/Développeur 3.jpg",
    name: "BOAVENTURA Honorat",
    role: "Développeur full stack",
    fonction: "Backend & Intégration",
    desc: "Conçoit des systèmes robustes et assure la performance des solutions numériques.",
  },
];

function IdentityPhoto({ className = "" }) {
  return (
    <div className={`about-panel about-panel--photo ${className}`}>
      <img
        src="/equipe/DG.jpg"
        alt="Directeur Général"
        className="about-panel__photo"
      />
      <span className="about-panel__caption">
        <strong>Directeur Général</strong>
        <span>
          Vision, leadership et développement stratégique de l’entreprise.
        </span>
      </span>
    </div>
  );
}

export default function About() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero__overlay" />
        <div className="container about-hero__content">
          <h1>QUI SOMMES-NOUS ?</h1>
          <p className="about-hero__tagline">
            L'information qui vous rapproche du monde qui vous entoure.
          </p>
          <p className="about-hero__text">
            Cortex Bénin TV est un média audiovisuel béninois dédié à
            l'information, à la production et au digital.
          </p>
          <Link to="/direct" className="about-hero__cta">
            <IconPlay /> Regarder le direct
          </Link>
        </div>
      </section>

      <section className="container about-identity">
        <div className="about-identity__text">
          <span className="about-eyebrow">Notre identité</span>
          <h2>CORTEX BÉNIN TV</h2>
          <span className="about-underline" />
          <p>Un média moderne, indépendant et responsable.</p>
          <p>
            Nous produisons et diffusons des contenus audiovisuels et numériques
            destinés à un public béninois, africain et international.
          </p>
          <p>
            Notre ambition : offrir une information fiable, accessible et
            impactante.
          </p>
          <a href="#services" className="about-btn about-btn--dark">
            En savoir plus
          </a>
        </div>
        <div className="about-identity__panels about-identity__panels--single">
          <IdentityPhoto className="about-panel--tall" />
        </div>
      </section>

      <section className="container about-team">
        <div className="about-team__text">
          <span className="about-eyebrow">Notre rédaction</span>
          <h2>UNE ÉQUIPE PASSIONNÉE</h2>
          <span className="about-underline" />
          <p>
            Notre force, c'est la complémentarité de nos talents. Journalistes,
            reporters, techniciens, monteurs, réalisateurs et producteurs
            unissent leur expertise, leur rigueur et leur créativité pour vous
            offrir une information fiable, vérifiée et de qualité. Chaque jour,
            nous mettons notre énergie et notre engagement au service d'un
            journalisme indépendant, responsable et proche de vous.
          </p>
          <a href="#services" className="about-btn about-btn--dark">
            Découvrir l'équipe
          </a>
        </div>
        <TeamGrid members={TEAM_MEMBERS} />
      </section>

      <section className="about-mission-activities">
        <div className="ama-col">
          <h2 className="about-section-title">Notre mission</h2>
          <div className="about-mission__grid">
            {MISSION.map(({ icon: Icon, title, text }) => (
              <div className="about-activity-card" key={title}>
                <div className="about-activity-card__body">
                  <span className="about-icon-square">
                    <Icon />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="ama-col">
          <h2 className="about-section-title">Nos activités</h2>
          <div className="about-activities__grid">
            {ACTIVITIES.map(({ icon: Icon, title, text }) => (
              <div className="about-activity-card" key={title}>
                <div className="about-activity-card__body">
                  <span className="about-icon-square">
                    <Icon />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-values">
        <div className="container">
          <h2 className="about-section-title">Nos valeurs</h2>
          <div className="about-values__grid">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <div className="about-values__item" key={title}>
                <span className="about-icon-outline">
                  <Icon />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="about-cta__overlay" />
        <div className="container about-cta__content">
          <div>
            <h2>Restez connectés à Cortex</h2>
            <p>L'information ne s'arrête jamais.</p>
          </div>
          <div className="about-cta__actions">
            <Link to="/direct" className="about-btn about-btn--primary">
              <IconPlay /> Regarder le direct
            </Link>
            <Link to="/" className="about-btn about-btn--outline">
              <IconDoc /> Voir les actualités
            </Link>
          </div>
          <div className="about-cta__social">
            <span>Suivez-nous</span>
            <div className="about-cta__social-icons">
              <a
                href="https://www.facebook.com/cortexbenintv"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <IconFacebook />
              </a>
              <a
                href="https://youtube.com/@cortexbenintv"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <IconYoutube />
              </a>
              <a
                href="https://vm.tiktok.com/ZS9Brm9XQDjB7-TbCqm/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                <IconTikTok />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
