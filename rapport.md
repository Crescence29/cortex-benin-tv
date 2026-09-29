# Rapport de suivi — Cortex Bénin TV

> Fichier vivant : mis à jour au fur et à mesure de l'avancement du projet.
> Dernière mise à jour : **29 septembre 2026**

**Nouveau dans cette mise à jour :** hiérarchie de rôles à 4 niveaux avec statuts de compte à 3 états (actif/suspendu/banni) et connexion développeur sans mot de passe (§2), section "Logs et surveillance" complète (§2), gestion de l'API (§2), gestion de la base de données avec sauvegarde/restauration (§2), gestion des fichiers et médias (§2 — constat important : ce site n'a aucun système d'upload, voir détail ci-dessous).

## Sommaire

- [1. Vue d'ensemble](#1-vue-densemble)
- [2. Fonctionnalités développées](#2-fonctionnalités-développées)
- [3. Fonctionnalités modifiées / améliorées](#3-fonctionnalités-modifiées--améliorées)
- [4. Erreurs rencontrées et corrections](#4-erreurs-rencontrées-et-corrections)
- [5. Fonctionnalités restantes à développer](#5-fonctionnalités-restantes-à-développer)
- [6. Infrastructure et déploiement](#6-infrastructure-et-déploiement)
- [7. Comptes et accès](#7-comptes-et-accès)

---

## 1. Vue d'ensemble

**Cortex Bénin TV** est un site d'actualités et de média (type portail TV/presse en ligne) avec :
- Frontend : React (Vite)
- Backend : Node.js / Express (ESM), MySQL (`mysql2/promise`)
- Authentification : JWT + sessions réelles en base
- Espace d'administration complet (rédaction, gestion des comptes, développeur)

Déploiement actuel (démo) :
- Frontend : Vercel — `https://cortex-benin-tv.vercel.app`
- Backend : Render — `https://cortex-benin-tv.onrender.com`
- Base de données : Aiven MySQL (plan gratuit)
- Code source : GitHub — `Crescence29/cortex-benin-tv`

---

## 2. Fonctionnalités développées

### Site public
- Page d'accueil, catégories, articles, vidéos/émissions, podcasts, direct, grille TV
- Pages À propos, Contact, Mentions légales, Confidentialité, Recherche
- **Projets/Campagnes** (`/projets`, `/projets/:slug`) : section dédiée aux campagnes de sensibilisation type Octobre Rose / Novembre Bleu — titre, période, description, galerie d'affiches/flyers (avec lightbox), vidéos réalisées (lues nativement ou lien externe selon le type d'URL). Gérable depuis `/admin/projets`, accessible à tout compte connecté (y compris journaliste) comme Articles/Vidéos — aucune restriction de rôle. Vidéos en URLs indépendantes du système Vidéos existant (choix explicite du client). Description en texte libre avec sauts de ligne préservés (`white-space: pre-line`) pour permettre une structure "C'est quoi / Objectif / Depuis quand / Que faire" sans éditeur riche. Deux fiches réelles créées en production : Octobre Rose et Novembre Bleu (contenu informatif factuel, sans affiches/vidéos pour l'instant — à ajouter par la rédaction)
- Newsletter avec validation d'email réelle (vérification DNS/MX, rejet des domaines invalides)
- Section équipe (grille statique avec animations d'entrée)
- Icônes Lucide React sur tout le site (remplacement des SVG personnalisés)

### Espace admin — Contenu
- Gestion des articles, vidéos, émissions, podcasts (CRUD, traductions, tags, galerie)
- Gestion du direct (Live), grille TV, planning
- Gestion des flux RSS externes (sources, récupération automatique toutes les 30 min)
- **Pipeline d'actualités automatisé** : récupération horaire des flux RSS → création de **brouillons** d'articles (jamais publiés automatiquement) → validation humaine obligatoire par un journaliste avant publication
- Gestion des annonces, messages de contact, abonnés newsletter, partenaires
- Analytics (vues articles/vidéos)
- Personnalisation de l'identité visuelle (logo image ou texte)

### Espace admin — Comptes, rôles et sécurité
- **Hiérarchie de rôles à 4 niveaux** : Super Admin → Administrateur → Manager → Utilisateur (rang strict, `canManage` = rang strictement supérieur)
- **Accès développeur séparé** (`is_developer`) de la hiérarchie métier — un compte peut être développeur sans droits métier élevés, et inversement
- Page **"Journalistes"** : liste en lecture seule des comptes
- Page **"Rôles et utilisateurs"** (réservée Administrateur+) :
  - Créer un compte, modifier un compte, désactiver/réactiver un compte
  - Réinitialiser un accès (mot de passe)
  - Attribuer un rôle (respecte la hiérarchie)
  - Voir la dernière connexion réelle
  - Voir les appareils/sessions actives (IP, appareil, dates) avec défilement horizontal si l'écran est étroit
  - Forcer la déconnexion (révocation réelle des sessions, pas juste attente d'expiration du JWT)
  - **Accès développeur protégé par confirmation à deux étapes** : génération d'un code à 6 chiffres côté serveur, à ressaisir pour confirmer l'octroi/le retrait — impossible de modifier son propre accès développeur (bouton masqué + blocage serveur)
- **Suivi de session réel** : table `sessions` (jti du JWT, IP, user-agent, dernière activité, révocation)

### Espace admin — Tableau de bord développeur
- **État technique** (données 100% réelles, mesurées en direct) :
  - État API, état base de données, temps de réponse moyen, requêtes traitées, erreurs serveur
  - Connexions (24h), disponibilité serveur (uptime), CPU (charge 1/5/15 min), RAM, espace disque
  - Version de l'application, dernier déploiement (lien vers le commit GitHub), dernière sauvegarde
  - Chaque ligne est cliquable et affiche un détail réel (ex. : liste des routes les plus appelées, échantillons de temps de réponse, connexions récentes, taille par table)
  - Sauvegarde manuelle (export JSON de toutes les tables, mots de passe exclus)
- **Gestion de l'API** (nouveau, données réelles) :
  - Liste des endpoints réellement enregistrés dans Express (introspection des routeurs), groupés par ressource façon documentation
  - Requêtes et erreurs par endpoint
  - Limites de requêtes réellement appliquées (`express-rate-limit` sur la connexion et les formulaires publics)
  - Statut des services externes : base de données, hébergement Render, chaque source RSS avec sa dernière récupération
  - Clés API / Tokens / Webhooks : affichés honnêtement comme non applicables (API strictement interne, pas de consommateurs tiers)
- Journal d'activité complet (connexions, échecs, création/suppression de comptes, changements de rôle, etc.)
- **Logs et surveillance** (nouveau, données réelles, avec recherche) :
  - Erreurs serveur (exceptions non gérées, avec message/route/horodatage)
  - Erreurs API (réponses en échec par endpoint)
  - **Erreurs JavaScript côté navigateur** — capturées en temps réel chez les vrais visiteurs (`window.onerror` / `unhandledrejection`) et remontées au serveur, pas seulement en local
  - Connexions et **déconnexions réelles** (la déconnexion révoque désormais la session côté serveur au lieu de juste vider le stockage local du navigateur)
  - Échecs d'authentification
  - Erreurs de synchronisation des flux RSS (échec de récupération d'une source, échec de création d'un brouillon)
  - Erreurs de paiement : affichées honnêtement comme non applicables — aucun système de paiement n'existe sur le site
  - Barre de recherche sur les logs et sur le journal d'audit (personne, action, IP, message)
- **Journal d'audit** ("qui a fait quoi ?") — renommage et recherche ajoutée sur le journal d'activité existant
- **Statuts de compte à 3 états** : Actif / Suspendu (réversible en un clic) / Banni (accordé et levé uniquement via un code de confirmation à 6 chiffres, pour que ce soit délibérément plus lourd à annuler qu'une simple suspension)
- **Connexion développeur sans mot de passe** ("Se connecter en tant que") : un développeur peut se connecter sur n'importe quel compte actif non-développeur sans en connaître le mot de passe, protégé par code de confirmation, session réelle créée et journalisée comme action sensible ; impossible sur soi-même ou sur un autre développeur
- **Gestion de la base de données** (données 100% réelles) : état, nombre de tables, taille totale, lignes (estimation), connexions actives, requêtes lentes, erreurs de connexion SQL, liste des migrations présentes dans le dépôt, vérification d'intégrité (CHECK TABLE), sauvegarde manuelle, et **restauration depuis une sauvegarde JSON** (protégée par code de confirmation, transaction tout-ou-rien, tables `users`/`sessions` volontairement exclues pour ne jamais casser les accès existants)
- **Gestion des fichiers et médias** — **constat important sur l'architecture réelle** : ce site n'a **aucun système d'upload de fichiers**. Les images/vidéos des articles sont des URL externes collées par les journalistes ; rien n'est jamais téléversé ni stocké sur le serveur. Panneau honnête construit sur ce qui existe vraiment : décompte des médias référencés par type, et **vérificateur de liens morts réel** (vraies requêtes HTTP sur chaque URL). Stockage/CDN/limites de taille/nettoyage automatique affichés comme non applicables plutôt que fabriqués. *Décision utilisateur : construire ensuite un vrai système d'upload avec stockage externe (reste à faire — voir §5)*
- **Déploiement et versions** — **constat important** : un seul environnement existe (chaque push sur `main` part directement sur Render/Vercel), aucune version taguée sur Git, aucun CHANGELOG.md, pas d'accès à l'API Render pour un rollback en un clic *(décision utilisateur : rester sur un seul environnement pour l'instant plutôt que de construire un vrai staging séparé)*. Panneau honnête construit sur le réel : commit déployé (Render) comparé au dernier commit GitHub pour détecter un retard de déploiement, historique des 20 derniers commits comme changelog/journal de déploiement (API GitHub publique), et procédure de rollback réelle documentée (`git revert` + push, ou redéploiement manuel d'un commit précédent depuis Render)
- **Configuration technique** : nom de l'application, URL principale, URL de l'API (déduite en direct de la requête, toujours exacte), version, environnement, fuseau horaire réel du serveur. **Mode maintenance réellement fonctionnel** — un développeur peut l'activer avec un message personnalisé, ce qui bloque effectivement le site public (page de maintenance) tout en laissant l'admin accessible pour le désactiver. Langue par défaut et email système éditables (informatifs). Les variables d'environnement sensibles (`DB_PASSWORD`, `JWT_SECRET`, `CRON_SECRET`) ne sont **jamais** renvoyées par l'API, même partiellement — seul un statut "défini/non défini" est exposé
- **Centre de maintenance** : consolide sauvegarde/restauration déjà existantes, ajoute le **suivi réel des 3 tâches planifiées** (flux RSS, brouillons, publication programmée) avec horodatage du dernier passage effectif et détection d'un retard, vérification à la demande de l'API/DB/flux RSS, réinitialisation honnête des compteurs de métriques (pas de vrai cache serveur à vider), et activation du mode maintenance protégée par un code de confirmation à 6 chiffres (désactivation en un clic, sans risque). Redémarrage de service et nettoyage de fichiers temporaires volontairement **non proposés** : aucun accès à l'API de l'hébergeur ni fichiers temporaires générés par cette application — affiché honnêtement comme non disponible plutôt que simulé
- **Double authentification (2FA) réelle** (TOTP, compatible Google Authenticator/Authy) : chaque compte peut l'activer depuis Paramètres (vrai QR code généré côté serveur, secret jamais écrit en base avant vérification), 8 codes de secours à usage unique générés à l'activation (hachés, jamais stockés en clair), flux de connexion à deux étapes (jeton temporaire à portée limitée en attendant le code), désactivation en confirmant son mot de passe
- **Panneau Sécurité** : résume ce qui existe déjà ailleurs (sessions, historique de connexion, IP, appareils, révocation, permissions granulaires) et ajoute le statut 2FA par compte et de vraies **alertes de sécurité** calculées à partir du journal d'activité (échecs de connexion répétés, bannissements/usurpations récents) — aucune donnée simulée. Clés API/tokens toujours non applicables (API interne)
- **Redesign visuel du tableau de bord développeur** : les 12 panneaux passent d'une longue liste verticale à une grille de cartes responsive (effet verre translucide, bordure lumineuse, ombre, légère élévation au survol, entrée en fondu échelonnée, halo pulsé sur les indicateurs "opérationnel"). Pas de `backdrop-filter` par choix de performance (coûteux empilé sur autant de cartes) — respecte `prefers-reduced-motion`

---

## 3. Fonctionnalités modifiées / améliorées

| Date | Modification |
|---|---|
| 11/09 | Séparation "Journalistes" (liste simple) et "Rôles et utilisateurs" (gestion complète) — étaient fusionnés par erreur au départ |
| 11/09 | Remplacement de la case à cocher "Développeur" par un vrai flux de confirmation par code à 6 chiffres |
| 11/09 | Ajout du blocage : impossible de modifier son propre accès développeur (bouton masqué + refus serveur) |
| 11/09 | Correction de l'affichage des tableaux admin sur écran étroit (colonnes invisibles) |
| 11/09 | Migration `role='editor'` → `role='manager'` (pas `'user'`) pour préserver la capacité de publication directe de Crescence Adjovi |
| 15/09 | Ajout des boutons "Sessions" (expansion + forcer la déconnexion) et "Supprimer" au panneau "Accès administrateurs" (onglet Développeur) — l'utilisateur avait cru à tort qu'ils avaient été retirés ; en réalité ce panneau ne les avait jamais eus (distinct de "Rôles et utilisateurs"), ajoutés pour uniformiser les deux panneaux |
| 15/09 | Correction d'un espace manquant avant les cartes larges ("Fichiers et médias" → "Logs et surveillance") du dashboard développeur : `column-span: all` fait perdre le margin-bottom de la carte précédente à cette frontière (bug de rendu du layout multi-colonnes) ; corrigé avec un margin-top compensatoire, neutralisé entre deux cartes larges consécutives pour rester à 22px partout |
| 21/09 | Ajout de "Actions administratives" et "Requêtes importantes" au panneau "Logs et surveillance" (catégories prévues dans la spec initiale mais absentes) — actions admin = tout le journal d'audit hors les 5 catégories déjà suivies, requêtes importantes = appels API mutants (POST/PUT/DELETE/PATCH) mesurés en mémoire. En testant la recherche, découverte et correction d'un bug préexistant : l'auto-rafraîchissement (toutes les 15-20s) écrasait un filtre de recherche actif avec la liste complète (closure figée sur la valeur vide au montage) |
| 28/09 | **Nouvelle section "Projets / Campagnes"** (ex: Octobre Rose, Novembre Bleu) : titre, période, description longue (sauts de ligne préservés), galerie d'affiches/flyers, vidéos réalisées. Page publique `/projets` + `/projets/:slug`, gestion depuis `/admin/projets` (accessible à tout compte connecté, comme Articles/Vidéos). Deux fiches réelles créées en production avec contenu factuel |
| 28/09 | **Vrai système d'upload de fichiers** (Cloudinary) : jusque-là il fallait coller une URL externe pour toute image/vidéo. Ajout d'un bouton "Galerie" (upload réel + resélection d'un fichier déjà envoyé, organisé par dossier) sur Projets, Articles (image principale, galerie, vidéo), Vidéos (fichier + miniature), Footer (logos émissions/partenaires) |
| 28-29/09 | **Durcissement de la sécurité** suite à un scan externe (OWASP ZAP + Mozilla HTTP Observatory) : ajout des en-têtes manquants sur le site public (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via `vercel.json`), retrait de `unsafe-inline` du style-src (confirmé inutile : React n'utilise jamais l'attribut HTML `style`), et CSP minimale (`default-src 'none'`) sur le backend qui ne sert que du JSON. Score final : **A+ / 120 / 100** sur Mozilla HTTP Observatory |
| 29/09 | Ajout de la **validation groupée des articles** : cases à cocher + "tout sélectionner" dans "Gestion des articles", barre d'action pour choisir la catégorie et publier plusieurs brouillons "À valider" d'un coup. Création du compte de rédaction "CORTEX BENIN TV" (byline, ne se connecte jamais) utilisé comme auteur par la validation groupée et par défaut pour les brouillons importés depuis les flux RSS (au lieu du premier compte admin trouvé) |
| 29/09 | **Audit visuel du site public** (à la demande du client) et corrections en cours, traitées une par une : (1) images manquantes/cassées — nouveau composant `SafeImage` qui retombe sur un remplacement stylé au lieu de l'icône cassée du navigateur, appliqué à toutes les pages publiques ; (2-3) chargement paresseux des images (`loading="lazy"`, sauf l'image "à la une" en `eager`) et animation d'apparition en fondu échelonnée sur les grilles de cartes (accueil, catégories, recherche, vidéos, projets, émissions, podcasts, direct local), respecte `prefers-reduced-motion`. **Reste à faire** : (4) skeleton loaders à la place du texte "Chargement…", (5) indice visuel sur la barre de catégories qui défile horizontalement, (6) revoir les photos génériques/stock sur certaines vidéos |
| Session précédente | Refonte de la section équipe (carrousel → grille statique) |
| Session précédente | Remplacement des icônes SVG personnalisées par Lucide React (sauf 5 logos de marque) |
| Session précédente | Ajout de la carte "Articles à valider" au tableau de bord, puis masquage de la carte "Comptes admin" pour les rôles non-admin |

---

## 4. Erreurs rencontrées et corrections

| Problème | Cause | Correction |
|---|---|---|
| Recommandation LWS pour domaine `.bj` invalide | Recommandation faite sans vérification en direct | Vérifié et corrigé → Netim |
| Recommandation db4free.net redirigeant vers un site suspect | Recommandation faite sans vérification en direct | Remplacé par Aiven (vérifié) |
| Base Aiven "Powered off" après inactivité | Limite du plan gratuit Aiven | Redémarrage manuel via console Aiven ; connu et accepté |
| Erreur 404 sur les routes profondes Vercel | Absence de `vercel.json` (pas de fallback SPA) | Ajout du rewrite catch-all vers `index.html` |
| Cron horaire des brouillons ne se déclenchait pas sur Render | Le service gratuit Render se met en veille (aucun code ne tourne, y compris les tâches planifiées) | Endpoint `/api/cron/tick` protégé par clé secrète créé comme solution de contournement, **mise en attente** : le vrai hébergement (Hostinger) réglera le problème nativement |
| `req.path` incorrect dans les métriques serveur | Lu trop tard (après réécriture de `req.url` par les routeurs imbriqués) | Capture de `method`/`path` en tout début de middleware |
| "Non authentifié" lors de la réactivation d'un compte | Session/JWT expiré côté navigateur (durée de vie 8h) | Reconnexion — pas un bug de code |
| "Seul un compte développeur peut..." malgré un compte développeur | Même cause : token périmé côté navigateur | Reconnexion |
| Case à cocher "0" affiché au lieu de rien | Bug JSX classique (`0 && <element>` affiche "0" car 0 est falsy mais rendu comme texte) | Remplacé par `!!valeur &&` |
| Colonnes "Statut", "Dernière connexion", actions invisibles | `.admin-panel { overflow: hidden }` coupait le contenu qui dépassait, sans barre de défilement | `overflow-x: auto` + largeur minimale du tableau |
| Auto-révocation possible de son propre accès développeur | Aucune protection initiale sur le PUT général ni sur le nouveau flux de confirmation | Bouton masqué pour soi-même + refus serveur explicite |
| `/api/analytics` renvoyait une erreur serveur (500) | Requête SQL invalide sous `sql_mode=only_full_group_by` (colonne non fonctionnellement dépendante du `GROUP BY`) — bug préexistant, découvert grâce au nouveau panneau "Logs et surveillance" | Remplacement du second `LEFT JOIN` par une sous-requête corrélée pour le titre de secours |
| Restauration de sauvegarde échouait sur les dates | MySQL refuse une date ISO ("...T...Z") telle quelle pour une colonne DATETIME | Conversion en objet `Date` avant insertion |
| Restauration de sauvegarde échouait sur `site_settings.data` (colonne JSON) | mysql2 désérialise une colonne JSON en objet JS à la lecture ; réinséré tel quel, MySQL recevait littéralement "[object Object]" | Reserialisation en JSON avant insertion |

---

## 5. Fonctionnalités restantes à développer

- [x] ~~Vrai système d'upload de fichiers avec stockage externe~~ — fait le 28/09 (Cloudinary), voir §3
- [ ] **Audit visuel du site public (suite)** — points 4 à 6 identifiés le 29/09, restants après (1) images cassées et (2-3) lazy-loading/animations déjà corrigés :
  - [ ] Skeleton loaders à la place du texte "Chargement…" (Home, Videos, Category en priorité)
  - [ ] Indice visuel (flèche/dégradé) sur la barre de catégories qui défile horizontalement, pour signaler qu'elle est scrollable
  - [ ] Revoir les photos génériques/stock utilisées sur certaines vidéos (cassent l'identité visuelle)
- [ ] Gérer les endpoints/routes d'`articles.js` et `videos.js` : gate déjà en place pour `canPublishDirectly`, à re-vérifier après tout futur changement de hiérarchie
- [ ] Application de la partie "Gestion de l'API" — vérifier long terme la pertinence de suivre plus finement les erreurs 4xx/5xx par route
- [ ] Migration vers un hébergement définitif (Hostinger pressenti) pour lever les limitations Render/Aiven gratuits (veille, cron horaire fiable)
- [ ] Une fois sur l'hébergement définitif : réactiver/adapter le pipeline cron horaire de brouillons sans le contournement `/api/cron/tick`
- [ ] Achat du nom de domaine `.bj` (registrar retenu : Netim, à confirmer/finaliser)
- [ ] Toute intégration de flux sportif en direct nécessite une licence de diffusion officielle (non disponible actuellement — voir section erreurs/refus)
- [ ] (Optionnel, si demandé) Système de scores/calendrier de matchs via une API sportive légitime (pas de vidéo)

---

## 6. Infrastructure et déploiement

- **Dépôt Git** : `github.com/Crescence29/cortex-benin-tv`
- **Backend (Render)** : redéploiement automatique à chaque push sur `main`
- **Frontend (Vercel)** : redéploiement automatique à chaque push sur `main`
- **Base de données (Aiven MySQL, plan gratuit)** : peut se mettre "Powered off" après inactivité prolongée — redémarrage manuel nécessaire dans ce cas
- Sauvegarde de sécurité de la table `users` prise avant chaque migration de schéma en production (`database/backups/`, exclu de Git)

---

## 7. Comptes et accès

| Compte | Rôle | Développeur |
|---|---|---|
| cortexbenin@gmail.com (Admin Cortex) | Super Admin | Oui |
| crescence@cortexbenin.tv (Crescence Adjovi) | Manager | Non |
| cortexadmin@gmail.com (Administrateur Cortex) | Administrateur | Non |

---

*Ce fichier doit être mis à jour à chaque nouvelle fonctionnalité, modification ou correction — ne pas le laisser devenir obsolète.*
