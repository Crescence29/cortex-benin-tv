import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Maintenance from './pages/Maintenance';
import { ensureLogoLoaded, getLogoState } from './logoStore';
import Footer from './components/Footer';
import NewsTicker from './components/NewsTicker';
import Home from './pages/Home';
import Category from './pages/Category';
import Article from './pages/Article';
import Videos from './pages/Videos';
import Podcasts from './pages/Podcasts';
import LocalLive from './pages/LocalLive';
import Emissions from './pages/Emissions';
import Video from './pages/Video';
import Live from './pages/Live';
import TvGrid from './pages/TvGrid';
import About from './pages/About';
import Contact from './pages/Contact';
import Legal from './pages/Legal';
import Privacy from './pages/Privacy';
import Search from './pages/Search';
import NotFound from './pages/NotFound';
import Unsubscribe from './pages/Unsubscribe';
import { AuthProvider } from './admin/AuthContext';
import Login from './admin/Login';
import Dashboard from './admin/Dashboard';
import ArticlesList from './admin/ArticlesList';
import ArticleForm from './admin/ArticleForm';
import VideoForm from './admin/VideoForm';
import FeedSources from './admin/FeedSources';
import LiveManager from './admin/LiveManager';
import TvSchedule from './admin/TvSchedule';
import Journalists from './admin/Journalists';
import RolesUsers from './admin/RolesUsers';
import Planning from './admin/Planning';
import Analytics from './admin/Analytics';
import Media from './admin/Media';
import Settings from './admin/Settings';
import FooterManager from './admin/FooterManager';
import Announcements from './admin/Announcements';
import Messages from './admin/Messages';
import Newsletter from './admin/Newsletter';
import DeveloperTab from './admin/DeveloperTab';
import ProtectedRoute from './admin/ProtectedRoute';
import './App.css';

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

// Le mode maintenance ne bloque que le site public : l'espace admin reste
// accessible pour qu'un développeur puisse toujours se connecter et le désactiver.
function PublicSite({ children }) {
  const [checked, setChecked] = useState(false);
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    ensureLogoLoaded().then(() => {
      setMaintenance(!!getLogoState().maintenance_mode);
      setChecked(true);
    });
  }, []);

  if (!checked) return null;
  if (maintenance) return <Maintenance message={getLogoState().maintenance_message} />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<Protected><Dashboard /></Protected>} />
        <Route path="/admin/articles" element={<Protected><ArticlesList /></Protected>} />
        <Route path="/admin/articles/:id" element={<Protected><ArticleForm /></Protected>} />
        <Route path="/admin/videos/new" element={<Protected><VideoForm /></Protected>} />
        <Route path="/admin/videos/:id" element={<Protected><VideoForm /></Protected>} />
        <Route path="/admin/flux" element={<Protected><FeedSources /></Protected>} />
        <Route path="/admin/direct" element={<Protected><LiveManager /></Protected>} />
        <Route path="/admin/tv" element={<Protected><TvSchedule /></Protected>} />
        <Route path="/admin/journalistes" element={<Protected><Journalists /></Protected>} />
        <Route path="/admin/roles-utilisateurs" element={<Protected><RolesUsers /></Protected>} />
        <Route path="/admin/planning" element={<Protected><Planning /></Protected>} />
        <Route path="/admin/analytics" element={<Protected><Analytics /></Protected>} />
        <Route path="/admin/medias" element={<Protected><Media /></Protected>} />
        <Route path="/admin/parametres" element={<Protected><Settings /></Protected>} />
        <Route path="/admin/footer" element={<Protected><FooterManager /></Protected>} />
        <Route path="/admin/annonces" element={<Protected><Announcements /></Protected>} />
        <Route path="/admin/messages" element={<Protected><Messages /></Protected>} />
        <Route path="/admin/newsletter" element={<Protected><Newsletter /></Protected>} />
        <Route path="/admin/developpeur" element={<Protected><DeveloperTab /></Protected>} />
        <Route
          path="*"
          element={
            <PublicSite>
              <Header />
              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/rubrique/:slug" element={<Category />} />
                  <Route path="/article/:slug" element={<Article />} />
                  <Route path="/videos" element={<Videos />} />
                  <Route path="/podcasts" element={<Podcasts />} />
                  <Route path="/en-direct-local" element={<LocalLive />} />
                  <Route path="/emissions" element={<Emissions />} />
                  <Route path="/video/:slug" element={<Video />} />
                  <Route path="/direct" element={<Live />} />
                  <Route path="/grille-tv" element={<TvGrid />} />
                  <Route path="/a-propos" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/mentions-legales" element={<Legal />} />
                  <Route path="/confidentialite" element={<Privacy />} />
                  <Route path="/recherche" element={<Search />} />
                  <Route path="/desabonnement" element={<Unsubscribe />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <NewsTicker />
            </PublicSite>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
