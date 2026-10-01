import './Skeleton.css';

export default function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} />;
}
