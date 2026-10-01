import { useEffect, useState } from 'react';
import { api } from '../api';
import SafeImage from './SafeImage';
import './LiveScores.css';

const POLL_MS = 60_000;

function MatchRow({ m }) {
  return (
    <div className="live-score">
      <span className="live-score__league">{m.league.name}</span>
      <div className="live-score__teams">
        <span className="live-score__team">
          <SafeImage src={m.home.logo} alt={m.home.name} placeholderClassName="live-score__team-placeholder" />
          {m.home.name}
        </span>
        <span className="live-score__result">
          {m.goals.home} - {m.goals.away}
        </span>
        <span className="live-score__team">
          <SafeImage src={m.away.logo} alt={m.away.name} placeholderClassName="live-score__team-placeholder" />
          {m.away.name}
        </span>
      </div>
      <span className="live-score__elapsed">{m.status.elapsed ? `${m.status.elapsed}'` : m.status.long}</span>
    </div>
  );
}

// Scores des matchs actuellement en direct (championnat du Bénin, Écureuils,
// compétitions africaines, grands championnats européens). Le plan gratuit
// de l'API utilisée ne permet pas d'afficher un calendrier à l'avance, donc
// ce composant ne montre que ce qui se joue en ce moment, et disparaît s'il
// n'y a aucun match en cours.
export default function LiveScores() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api.getLiveScores().then((data) => {
        if (!cancelled) setMatches(data);
      }).catch(() => {});
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (matches.length === 0) return null;

  return (
    <div className="live-scores">
      <h3 className="live-scores__title">
        <span className="live-scores__dot" /> En direct
      </h3>
      {matches.map((m) => (
        <MatchRow key={m.id} m={m} />
      ))}
    </div>
  );
}
