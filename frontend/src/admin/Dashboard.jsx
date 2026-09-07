import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from './AuthContext';
import AdminLayout from './AdminLayout';
import {
  IconDoc,
  IconVideo,
  IconRss,
  IconEye,
  IconPlus,
  IconTrash,
  IconBroadcast,
  IconLayout,
  IconUsers,
  IconShield,
  IconMail,
} from '../components/Icons';

function StatCard({ icon: Icon, value, label, to }) {
  const content = (
    <>
      <div className="stat-card__icon">
        <Icon />
      </div>
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="stat-card" style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }
  return <div className="stat-card">{content}</div>;
}

function StatusBadge({ status }) {
  return (
    <span className={'badge ' + (status === 'published' ? 'badge--published' : 'badge--draft')}>
      {status === 'published' ? 'Publié' : 'Brouillon'}
    </span>
  );
}

function LangPills({ translations }) {
  return (
    <div className="lang-pills">
      {translations.map((tr) => (
        <span key={tr.lang_code} className="lang-pill">{tr.lang_code.toUpperCase()}</span>
      ))}
    </div>
  );
}

function ServiceRow({ label, ok, hint }) {
  return (
    <div className="service-row">
      <span>{label}</span>
      <span className={'service-row__status' + (ok ? ' is-ok' : ' is-down')}>
        {ok ? '● Opérationnel' : '● Indisponible'}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [feedSources, setFeedSources] = useState([]);
  const [partners, setPartners] = useState([]);
  const [shows, setShows] = useState([]);
  const [users, setUsers] = useState([]);
  const [newsletterCount, setNewsletterCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [live, setLive] = useState(null);
  const [health, setHealth] = useState(null);
  const [healthCheckedAt, setHealthCheckedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      api.adminGetArticles(),
      api.adminGetVideos(),
      api.getFeedSources(),
      api.getLive(),
      api.adminGetPartners(),
      api.adminGetShows(),
      api.getUsers(),
      api.getNewsletterCount().catch(() => ({ total: 0 })),
      api.getAnalytics().catch(() => null),
      api.adminGetContactMessages().catch(() => []),
    ])
      .then(([a, v, f, l, p, s, u, nl, an, msgs]) => {
        setArticles(a);
        setVideos(v);
        setFeedSources(f);
        setLive(l);
        setPartners(p);
        setShows(s);
        setUsers(u);
        setNewsletterCount(nl.total);
        setAnalytics(an);
        setMessages(msgs);
      })
      .finally(() => setLoading(false));
  }

  function checkHealth() {
    api.getHealth().then((h) => {
      setHealth(h);
      setHealthCheckedAt(new Date());
    }).catch(() => {
      setHealth({ api: 'error', db: 'error' });
      setHealthCheckedAt(new Date());
    });
  }

  useEffect(() => {
    load();
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  async function onDeleteArticle(id) {
    if (!confirm('Supprimer cet article et toutes ses traductions ?')) return;
    await api.deleteArticle(id);
    load();
  }

  async function onDeleteVideo(id) {
    if (!confirm('Supprimer cette vidéo ?')) return;
    await api.deleteVideo(id);
    load();
  }

  const unreadMessages = messages.filter((m) => !m.is_read).length;
  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const editorCount = users.filter((u) => u.role === 'editor').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const totalViews = analytics ? analytics.articles.views + analytics.videos.views : null;

  const recentActivity = [
    ...articles.map((a) => ({ ...a, _type: 'article' })),
    ...videos.map((v) => ({ ...v, _type: 'video' })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  const roleLabel = user?.is_super_admin ? 'Développeur' : user?.role === 'admin' ? 'Administrateur' : 'Journaliste';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AdminLayout>
      <div className="admin-greeting">
        <h1>BONJOUR, {roleLabel.toUpperCase()}</h1>
        <div className="admin-greeting__date">{today}</div>
      </div>

      <div className="stat-cards">
        <StatCard icon={IconDoc} value={articles.length} label="Articles" />
        <StatCard icon={IconVideo} value={videos.length} label="Vidéos" />
        <StatCard icon={IconEye} value={totalViews ?? publishedCount} label={totalViews !== null ? 'Vues totales' : 'Publiés'} />
        <StatCard icon={IconUsers} value={users.length} label="Comptes admin" />
        <StatCard icon={IconMail} value={newsletterCount} label="Abonnés newsletter" to="/admin/newsletter" />
        <StatCard icon={IconMail} value={unreadMessages} label="Messages non lus" to="/admin/messages" />
      </div>

      <div className="dashboard-triple">
        <div className="admin-panel">
          <div className="admin-panel__header">
            <h2>Répartition des rôles</h2>
          </div>
          <div className="role-breakdown">
            <div className="role-row">
              <span>Journalistes</span>
              <strong>{editorCount}</strong>
            </div>
            <div className="role-row">
              <span>Administrateurs</span>
              <strong>{adminCount}</strong>
            </div>
            <div className="role-row">
              <span>Abonnés newsletter</span>
              <strong>{newsletterCount}</strong>
            </div>
            <div className="role-row">
              <span>Logos footer (partenaires + émissions)</span>
              <strong>{partners.length + shows.length}</strong>
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel__header">
            <h2><IconShield style={{ width: 16, height: 16, marginRight: 6, verticalAlign: -2 }} /> Sécurité &amp; intégrité</h2>
          </div>
          <div className="security-panel">
            <p>Les mots de passe sont chiffrés (bcrypt) et l'accès admin protégé par jeton signé (JWT), jamais stocké en clair.</p>
            <p className="security-panel__ok">✓ Connexion à la base de données {health?.db === 'ok' ? 'sécurisée et active' : 'vérifiée périodiquement'}</p>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel__header">
            <h2>Statut des services</h2>
          </div>
          <div className="service-panel">
            <ServiceRow label="API serveur" ok={health?.api === 'ok'} />
            <ServiceRow label="Base de données MySQL" ok={health?.db === 'ok'} />
            <p className="service-panel__hint">
              {healthCheckedAt ? `Dernière vérification : ${healthCheckedAt.toLocaleTimeString()} (auto-actualisé toutes les 30s)` : 'Vérification en cours…'}
            </p>
          </div>
        </div>
      </div>

      <Link to="/admin/direct" className={'live-panel' + (live?.is_live ? '' : ' live-panel--off')} style={{ display: 'block' }}>
        <div className="live-panel__title">
          <IconBroadcast /> Diffusion en direct
        </div>
        <div className="live-panel__status">{live?.is_live ? 'À l’antenne' : 'Hors antenne'}</div>
        <div className="live-panel__hint">
          {live?.is_live ? live.title || 'Aucun titre renseigné' : 'Cliquer pour gérer la diffusion en direct'}
        </div>
      </Link>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Messages</h2>
          <Link to="/admin/messages" className="btn btn--sm btn--outline">Voir les messages</Link>
        </div>
        <div className="admin-empty" style={{ textAlign: 'left', padding: '16px 20px' }}>
          {messages.length} message{messages.length !== 1 ? 's' : ''} reçu{messages.length !== 1 ? 's' : ''} via le formulaire de contact
          {unreadMessages > 0 && ` · ${unreadMessages} non lu${unreadMessages !== 1 ? 's' : ''}`}
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Footer du site</h2>
          <Link to="/admin/footer" className="btn btn--sm btn--outline">Gérer les logos</Link>
        </div>
        <div className="admin-empty" style={{ textAlign: 'left', padding: '16px 20px' }}>
          {shows.length} logo{shows.length !== 1 ? 's' : ''} d'émission · {partners.length} partenaire{partners.length !== 1 ? 's' : ''} affichés en bas du site public
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Activité récente</h2>
        </div>
        {!loading && recentActivity.length === 0 && <div className="admin-empty">Rien à afficher pour le moment.</div>}
        <div className="activity-list">
          {recentActivity.map((item) => (
            <div className="activity-row" key={`${item._type}-${item.id}`}>
              <span className={'activity-row__dot ' + (item.status === 'published' ? 'activity-row__dot--published' : 'activity-row__dot--draft')} />
              <span className="activity-row__text">
                <span className="activity-row__category">{item.category_name} — </span>
                {item.title || '(sans titre)'}
              </span>
              <span className={'activity-row__status ' + (item.status === 'published' ? 'activity-row__status--published' : 'activity-row__status--draft')}>
                {item.status === 'published' ? 'Publié' : 'En rédaction'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Articles récents</h2>
          <Link to="/admin/articles" className="btn btn--sm btn--outline">Voir tous les articles</Link>
        </div>
        {!loading && articles.length === 0 && <div className="admin-empty">Aucun article pour le moment.</div>}
        {articles.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Langues</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articles.slice(0, 5).map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="row-thumb">
                      {a.cover_image && <img src={a.cover_image} alt="" className="row-thumb__img" />}
                      <span className="row-thumb__title">{a.title || '(sans titre)'}</span>
                    </div>
                  </td>
                  <td>{a.category_name}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><LangPills translations={a.translations} /></td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/admin/articles/${a.id}`} title="Éditer"><IconDoc /></Link>
                      <button onClick={() => onDeleteArticle(a.id)} title="Supprimer"><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2>Vidéos</h2>
          <Link to="/admin/videos/new" className="btn btn--sm"><IconPlus /> Nouvelle vidéo</Link>
        </div>
        {!loading && videos.length === 0 && <div className="admin-empty">Aucune vidéo pour le moment.</div>}
        {videos.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Vidéo</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Langues</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="row-thumb">
                      {v.thumbnail && <img src={v.thumbnail} alt="" className="row-thumb__img" />}
                      <span className="row-thumb__title">{v.title || '(sans titre)'}</span>
                    </div>
                  </td>
                  <td>{v.category_name}</td>
                  <td><StatusBadge status={v.status} /></td>
                  <td><LangPills translations={v.translations} /></td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/admin/videos/${v.id}`} title="Éditer"><IconVideo /></Link>
                      <button onClick={() => onDeleteVideo(v.id)} title="Supprimer"><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
