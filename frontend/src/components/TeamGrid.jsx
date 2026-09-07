import { useEffect, useRef, useState } from 'react';
import './TeamGrid.css';

const COLS = 3;

export default function TeamGrid({ members }) {
  const gridRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={'team-grid' + (visible ? ' is-visible' : '')} ref={gridRef}>
      {members.map((m, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const fromLeft = row % 2 === 0;
        const rowStart = row * 150;
        const delay = rowStart + col * 110;
        return (
          <div
            key={m.img}
            className={'team-grid__card' + (fromLeft ? ' team-grid__card--left' : ' team-grid__card--right')}
            style={{ transitionDelay: `${delay}ms` }}
          >
            <div className="team-grid__media">
              <img src={m.img} alt={m.name || m.role} loading="lazy" />
              <div className="team-grid__overlay" />
            </div>
            <div className="team-grid__body">
              {m.name && <h3 className="team-grid__name">{m.name}</h3>}
              <h4>{m.role}</h4>
              {m.fonction && <span className="team-grid__fonction">{m.fonction}</span>}
              <p>{m.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
