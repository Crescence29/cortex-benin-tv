import { Link } from 'react-router-dom';

export default function VideoCard({ video }) {
  return (
    <article className="video-card">
      <Link to={`/video/${video.slug}`} className="video-card__media">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} />
        ) : (
          <div className="article-card__placeholder" />
        )}
        <span className="video-card__play">▶</span>
      </Link>
      <div className="video-card__body">
        {video.program && <span className="video-card__program">{video.program}</span>}
        <h3>
          <Link to={`/video/${video.slug}`}>{video.title}</Link>
        </h3>
      </div>
    </article>
  );
}
