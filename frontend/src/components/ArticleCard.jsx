import { Link } from 'react-router-dom';

export default function ArticleCard({ article, size = 'normal' }) {
  return (
    <article className={`article-card article-card--${size}`}>
      <Link to={`/article/${article.slug}`} className="article-card__media">
        {article.cover_image ? (
          <img src={article.cover_image} alt={article.title} />
        ) : (
          <div className="article-card__placeholder" />
        )}
        <span className="article-card__category">{article.category_name}</span>
      </Link>
      <div className="article-card__body">
        <h3>
          <Link to={`/article/${article.slug}`}>{article.title}</Link>
        </h3>
        {article.excerpt && <p>{article.excerpt}</p>}
      </div>
    </article>
  );
}
