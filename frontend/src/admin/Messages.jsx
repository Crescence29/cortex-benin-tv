import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconTrash, IconMail, IconUser, IconPhone } from '../components/Icons';

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Messages() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.adminGetContactMessages().then(setItems).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSelect(m) {
    setSelected(m);
    if (!m.is_read) {
      await api.markContactMessageRead(m.id);
      setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_read: true } : x)));
    }
  }

  async function onDelete(id) {
    if (!confirm('Supprimer ce message ?')) return;
    await api.deleteContactMessage(id);
    if (selected?.id === id) setSelected(null);
    load();
  }

  const unreadCount = items.filter((m) => !m.is_read).length;

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Messages</h1>
          <p className="admin-topbar__subtitle">
            {items.length} message{items.length !== 1 ? 's' : ''} reçu{items.length !== 1 ? 's' : ''} via le formulaire de contact
            {unreadCount > 0 && ` · ${unreadCount} non lu${unreadCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="messages-layout">
        <div className="admin-panel messages-list">
          {!loading && items.length === 0 && <div className="admin-empty">Aucun message pour le moment.</div>}
          {items.map((m) => (
            <button
              key={m.id}
              className={'messages-list__item' + (selected?.id === m.id ? ' is-active' : '') + (!m.is_read ? ' is-unread' : '')}
              onClick={() => onSelect(m)}
              type="button"
            >
              {!m.is_read && <span className="messages-list__dot" />}
              <span className="messages-list__name">{m.name}</span>
              <span className="messages-list__subject">{m.subject || m.message.slice(0, 60)}</span>
              <span className="messages-list__date">{formatDate(m.created_at)}</span>
            </button>
          ))}
        </div>

        <div className="admin-panel messages-detail">
          {!selected ? (
            <div className="admin-empty">Sélectionnez un message pour le lire.</div>
          ) : (
            <div className="messages-detail__body">
              <div className="messages-detail__header">
                <div>
                  <h2>{selected.subject || 'Sans objet'}</h2>
                  <span className="messages-detail__date">{formatDate(selected.created_at)}</span>
                </div>
                <button className="row-actions" onClick={() => onDelete(selected.id)} title="Supprimer">
                  <IconTrash />
                </button>
              </div>

              <div className="messages-detail__meta">
                <span><IconUser /> {selected.name}{selected.company ? ` — ${selected.company}` : ''}</span>
                <span><IconMail /> <a href={`mailto:${selected.email}`}>{selected.email}</a></span>
                {selected.phone && <span><IconPhone /> {selected.phone}</span>}
              </div>

              <p className="messages-detail__text">{selected.message}</p>

              <a className="btn" href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || 'Votre message')}`}>
                Répondre par email
              </a>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
