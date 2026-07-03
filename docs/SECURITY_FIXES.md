# Corrections de sécurité — Branche `secure`

Ce document décrit les corrections appliquées par rapport à la branche `vulnerable`. Chaque correction traite la **cause profonde**, pas seulement un payload spécifique.

## Synthèse

| Faille (vulnerable) | Correction (secure) | Fichier(s) |
|---------------------|---------------------|------------|
| IDOR réservations | Vérification `user_id === req.user.id` ou rôle admin | `routes/reservations.js` |
| BOLA admin | Middleware `adminRequired` sur `/api/admin/*` | `routes/admin.js` |
| Injection SQL | Requêtes paramétrées (`LIKE ?`) | `routes/movies.js` |
| XSS réfléchi | Messages d'erreur génériques + rendu texte React | `routes/auth.js`, `login/page.tsx` |
| XSS stocké | Sanitization HTML côté serveur + rendu texte | `routes/reviews.js`, `movies/[id]/page.tsx` |
| Auth faible | JWT secret fort (32+ chars), expiration 1h, bcrypt 12, rate limiting | `middleware/auth.js`, `routes/auth.js`, `middleware/rateLimit.js` |
| Mass assignment | Whitelist stricte des champs modifiables | `routes/users.js`, `routes/reservations.js` |
| Information disclosure | Erreurs génériques en production, pas de stack trace | `index.js` |
| Misconfiguration | Suppression `/api/debug/config`, Helmet, CORS restreint | `index.js` |
| Données sensibles | Champs API limités, pas de hash mot de passe exposé | `routes/users.js`, `routes/reservations.js` |
| Security headers | Helmet + CSP/X-Frame-Options côté Next.js | `index.js`, `next.config.js` |

## Détail des corrections

### 1. IDOR / BOLA
- `GET /api/reservations/:id` : accès refusé si la réservation n'appartient pas à l'utilisateur (sauf admin).
- `DELETE /api/reservations/:id` : même contrôle d'ownership.
- `GET /api/admin/stats` : réservé au rôle `admin`.

### 2. Injection SQL
- Recherche films via `db.prepare('... LIKE ?').all(pattern, pattern)`.
- Longueur de recherche limitée à 100 caractères.

### 3. XSS
- Backend : `sanitizeText()` échappe les caractères HTML dans les avis.
- Frontend : suppression de `dangerouslySetInnerHTML`, affichage en texte.
- CSP configurée dans `next.config.js`.

### 4. Authentification
- `JWT_SECRET` obligatoire (min. 32 caractères), pas de valeur par défaut faible.
- Expiration token : 1 heure.
- bcrypt cost factor : 12.
- Message d'erreur unique : « Identifiants invalides ».
- Rate limiting : 10 tentatives / 15 min sur `/api/auth/login`.

### 5. Mass Assignment
- `PATCH /api/users/me` : seuls `email` et `bio` acceptés.
- `POST /api/reservations` : `total_price`, `status`, `user_id` ignorés ; prix calculé serveur.

### 6. Information Disclosure
- Handler d'erreurs global sans stack trace en `NODE_ENV=production`.
- Endpoint debug supprimé.
- `GET /api/health` ne expose plus l'environnement.

### 7. CORS & Headers
- CORS limité à `CORS_ORIGIN` (défaut `http://localhost:3000`).
- Helmet activé sur l'API.
- Headers de sécurité sur le frontend Next.js.

### 8. Validation des entrées
- Email format validé à l'inscription.
- Mot de passe min. 8 caractères.
- Tarifs limités à `enfant`, `etudiant`, `adulte`.
- Vérification que les places appartiennent à la salle de la séance.

## Comparaison des branches

```bash
git diff vulnerable..secure --stat
```

## Tests de non-régression sécurité

```bash
# IDOR bloqué
curl -s http://localhost:3001/api/reservations/4 -H "Authorization: Bearer $USER_TOKEN"
# → 403 Accès refusé

# SQLi bloquée
curl -s "http://localhost:3001/api/movies/search?q=' UNION SELECT ..."
# → résultats vides ou erreur, pas de fuite users

# Debug supprimé
curl -s http://localhost:3001/api/debug/config
# → 404

# BOLA admin bloqué
curl -s http://localhost:3001/api/admin/stats -H "Authorization: Bearer $USER_TOKEN"
# → 403 Accès refusé
```
