# Cortex Bénin TV

Site d'actualités (portail type France24) pour Cortex Bénin TV : articles, vidéos/émissions, et agrégation de flux RSS externes, avec un espace d'administration.

## Structure

- `database/schema.sql` — schéma MySQL (catégories, articles, vidéos, sources RSS, utilisateurs)
- `backend/` — API Node.js/Express + MySQL (port 4000)
- `frontend/` — site React (Vite) + espace admin (port 5173)

## Démarrage

### 1. Base de données

Le schéma a déjà été chargé dans MySQL local (WAMP, base `cortex_benin_tv`). Pour repartir de zéro :

```bash
mysql -u root < database/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # ajuster les identifiants MySQL si besoin
npm run dev
```

Créer un compte admin :

```bash
node src/scripts/createAdmin.js "Nom" email@example.com motdepasse
```

Compte admin créé pour la démo :
- Email : `cortexbenin@gmail.com`
- Mot de passe : `Cortex2026!` (**à changer**)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173 — l'admin est accessible sur `/admin/login`.

## À faire avant mise en production

1. **Logo** : déposer le fichier logo réel dans `frontend/public/logo.png` (référencé par le header).
2. **Mot de passe admin** : changer le mot de passe par défaut.
3. **Hébergement** : prévoir un hébergeur supportant Node.js + MySQL pour un domaine `.bj` (OFAC/ANIA gèrent l'enregistrement `.bj`).
4. **Variables d'environnement** : définir `JWT_SECRET`, `DB_*`, `CORS_ORIGIN` en production (ne jamais committer `.env`).
5. **Sources RSS** : ajouter/retirer les flux depuis l'admin (`/admin/flux`) — le rafraîchissement automatique tourne toutes les 30 min.
