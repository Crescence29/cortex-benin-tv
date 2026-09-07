import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminLayout from './AdminLayout';
import { IconTrash, IconPlus } from '../components/Icons';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function TvSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ day_of_week: 1, start_time: '19:00', title: '', category_id: '' });

  function load() {
    api.getTvSchedule().then(setSchedule);
  }

  useEffect(() => {
    load();
    api.getCategories({ lang: 'fr' }).then(setCategories);
  }, []);

  async function onAdd(e) {
    e.preventDefault();
    await api.createTvSlot(form);
    setForm({ ...form, title: '' });
    load();
  }

  async function onDelete(id) {
    await api.deleteTvSlot(id);
    load();
  }

  return (
    <AdminLayout>
      <div className="admin-topbar">
        <div>
          <h1>Grille TV</h1>
          <p className="admin-topbar__subtitle">Programme hebdomadaire de la chaîne</p>
        </div>
      </div>

      <form onSubmit={onAdd} className="admin-form" style={{ marginBottom: 24 }}>
        <label>
          Jour
          <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}>
            {DAYS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Heure
          <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
        </label>
        <label>
          Titre du programme
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </label>
        <label>
          Catégorie (optionnel)
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">— Aucune —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn"><IconPlus /> Ajouter au planning</button>
      </form>

      {DAYS.map((day, i) => {
        const items = schedule.filter((s) => s.day_of_week === i);
        if (items.length === 0) return null;
        return (
          <div className="admin-panel" key={i}>
            <div className="admin-panel__header">
              <h2>{day}</h2>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Heure</th><th>Programme</th><th>Catégorie</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td>{s.start_time?.slice(0, 5)}</td>
                    <td>{s.title}</td>
                    <td>{s.category_name || '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => onDelete(s.id)} title="Supprimer"><IconTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      {schedule.length === 0 && <div className="admin-empty">Aucun programme dans la grille pour le moment.</div>}
    </AdminLayout>
  );
}
