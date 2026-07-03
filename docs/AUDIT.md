# Audit de sécurité — CinémaBook

Audit de la version **vulnérable** (`branche vulnerable`) de l'application de réservation cinéma, avec corrections et validations sur la branche **secure**.

> Usage pédagogique et local uniquement.

---

## Synthèse

| # | Nom | Type OWASP | Criticité |
|---|-----|------------|-----------|
| 1 | Accès aux réservations d'autrui (IDOR) | A01:2021 — Broken Access Control | Élevée |
| 2 | Panneau admin accessible sans rôle (BOLA) | A01:2021 — Broken Access Control | Élevée |
| 3 | Injection SQL dans la recherche de films | A03:2021 — Injection | Critique |
| 4 | XSS réfléchi sur la page de connexion | A03:2021 — Injection (XSS) | Élevée |
| 5 | XSS stocké dans les avis films | A03:2021 — Injection (XSS) | Élevée |
| 6 | Authentification faible | A07:2021 — Identification and Authentication Failures | Élevée |
| 7 | Mass assignment (rôle et prix) | A04:2021 — Insecure Design / API4:2023 — Unrestricted Resource Consumption | Élevée |
| 8 | Misconfiguration et fuite d'informations | A05:2021 — Security Misconfiguration | Moyenne à élevée |

---

## 1. Accès aux réservations d'autrui (IDOR)

| Élément | Contenu |
|---------|---------|
| **Nom** | Insecure Direct Object Reference (IDOR) sur les réservations |
| **Type** | OWASP A01:2021 — Broken Access Control / API1:2023 — BOLA |
| **Endpoint ou zone concernée** | `GET /api/reservations/:id`, `DELETE /api/reservations/:id` — `backend/src/routes/reservations.js` |
| **Description** | Un utilisateur authentifié peut consulter ou annuler la réservation d'un autre client en modifiant l'identifiant numérique dans l'URL de l'API ou du frontend (`/reservations/[id]`). |
| **Cause** | L'endpoint vérifie uniquement la présence d'un token JWT valide, sans contrôler que `reservation.user_id` correspond à `req.user.id`. |
| **Exploitation** | 1. Se connecter avec `user@demo.local`. 2. Récupérer son token. 3. Appeler `GET /api/reservations/4` (ID d'une réservation admin). 4. Lire email, places et montant de l'autre client. |
| **Preuve** | **Requête :** `GET /api/reservations/4` avec `Authorization: Bearer <token_user>`. **Réponse (vulnerable) :** `200 OK` avec `user_email: "admin@demo.local"`, places et prix. **Réponse (secure) :** `403 {"error":"Accès refusé"}`. |
| **Impact** | **Technique :** fuite de données personnelles (email, historique de réservation). **Métier :** violation RGPD, perte de confiance client, possibilité d'annulation non autorisée. |
| **Criticité** | Élevée |
| **Correction (branche secure)** | Vérification d'ownership avant lecture/suppression : `req.user.role === 'admin' \|\| reservation.user_id === req.user.id`. |
| **Validation** | Test automatisé `backend/tests/api.test.js` — « bloque l'accès IDOR aux réservations » → statut `403`. |

---

## 2. Panneau admin accessible sans rôle (BOLA)

| Élément | Contenu |
|---------|---------|
| **Nom** | Broken Object Level Authorization — statistiques admin |
| **Type** | OWASP A01:2021 — Broken Access Control / API5:2023 — BFLA |
| **Endpoint ou zone concernée** | `GET /api/admin/stats`, page `/admin` — `backend/src/routes/admin.js` |
| **Description** | Tout utilisateur connecté (rôle `user`) peut accéder aux statistiques globales du cinéma : nombre d'utilisateurs, revenus, liste des réservations récentes avec emails clients. |
| **Cause** | Le middleware `authRequired` est appliqué mais pas `adminRequired`. Aucune vérification du champ `role` dans le token. |
| **Exploitation** | 1. Se connecter en tant qu'utilisateur standard. 2. Appeler `GET /api/admin/stats` ou visiter `/admin`. 3. Consulter les données business sensibles. |
| **Preuve** | **Requête :** `GET /api/admin/stats` + token user. **Réponse (vulnerable) :** `200` avec `revenue`, `recent_reservations[].email`. **Réponse (secure) :** `403 {"error":"Accès refusé"}`. |
| **Impact** | **Technique :** élévation de lecture sur ressources admin. **Métier :** exposition du chiffre d'affaires et des données clients à un employé ou attaquant non autorisé. |
| **Criticité** | Élevée |
| **Correction (branche secure)** | Ajout de `adminRequired` sur toutes les routes `/api/admin/*`. Lien Admin masqué côté frontend sauf si `user.role === 'admin'`. |
| **Validation** | Test `api.test.js` — « bloque l'accès admin pour un utilisateur standard » → `403`. Admin → `200`. |

---

## 3. Injection SQL dans la recherche de films

| Élément | Contenu |
|---------|---------|
| **Nom** | SQL Injection (SQLi) — recherche films |
| **Type** | OWASP A03:2021 — Injection |
| **Endpoint ou zone concernée** | `GET /api/movies/search?q=` — `backend/src/routes/movies.js` |
| **Description** | Le paramètre de recherche `q` est concaténé directement dans une requête SQL, permettant d'injecter du SQL arbitraire. |
| **Cause** | Construction de la requête par interpolation de chaîne : `` `SELECT * FROM movies WHERE title LIKE '%${q}%'` `` au lieu d'un placeholder `?`. |
| **Exploitation** | Envoyer un payload UNION-based pour extraire la table `users` : `q=' UNION SELECT id,email,password,role,bio FROM users--` |
| **Preuve** | **Requête :** `GET /api/movies/search?q='%20UNION%20SELECT%20id,email,password,role,bio%20FROM%20users--`. **Réponse (vulnerable) :** films contenant `user@demo.local` dans le champ `title` et hash bcrypt dans `synopsis`. **Réponse (secure) :** résultats légitimes uniquement, pas de fuite users. |
| **Impact** | **Technique :** lecture intégrale de la BDD, extraction de credentials hashés. **Métier :** compromission totale des comptes clients, fraude, atteinte réglementaire. |
| **Criticité** | Critique |
| **Correction (branche secure)** | Requête paramétrée : `db.prepare('... LIKE ?').all('%' + q + '%')`. Limite de 100 caractères sur `q`. |
| **Validation** | Test `api.test.js` — « utilise des requêtes paramétrées pour la recherche » — aucun email `@demo` dans les résultats avec payload `' OR 1=1 --`. |

---

## 4. XSS réfléchi — page de connexion

| Élément | Contenu |
|---------|---------|
| **Nom** | Cross-Site Scripting réfléchi (Reflected XSS) |
| **Type** | OWASP A03:2021 — Injection (XSS) |
| **Endpoint ou zone concernée** | `POST /api/auth/login`, `frontend/app/login/page.tsx` |
| **Description** | L'email saisi est renvoyé tel quel dans le message d'erreur, puis injecté dans le DOM via `dangerouslySetInnerHTML`. |
| **Cause** | Côté API : message personnalisé `Aucun compte trouvé pour l'email : ${email}`. Côté frontend : rendu HTML non échappé de ce message. |
| **Exploitation** | 1. Aller sur `/login`. 2. Saisir `<img src=x onerror=alert('XSS')>@test.com` comme email. 3. Soumettre → exécution JavaScript dans le navigateur. |
| **Preuve** | **Payload :** email = `<script>alert(1)</script>@x.com`. **Réponse API (vulnerable) :** `{"error":"Aucun compte trouvé pour l'email : <script>..."}`. **Comportement (secure) :** message générique « Identifiants invalides », rendu en texte React (`{error}`). |
| **Impact** | **Technique :** exécution de script, vol de token localStorage, redirection phishing. **Métier :** compromission de session client, atteinte à l'image de marque. |
| **Criticité** | Élevée |
| **Correction (branche secure)** | Message d'erreur générique côté API. Suppression de `dangerouslySetInnerHTML`. CSP configurée dans `next.config.js`. |
| **Validation** | Test `api.test.js` — erreur = « Identifiants invalides », champ `reflected` absent. Test frontend — `login/page.tsx` sans `dangerouslySetInnerHTML`. |

---

## 5. XSS stocké — avis sur les films

| Élément | Contenu |
|---------|---------|
| **Nom** | Cross-Site Scripting stocké (Stored XSS) |
| **Type** | OWASP A03:2021 — Injection (XSS) |
| **Endpoint ou zone concernée** | `POST /api/reviews`, `GET /api/reviews?movieId=`, `frontend/app/movies/[id]/page.tsx` |
| **Description** | Un avis contenant du HTML/JavaScript est stocké en base et ré-exécuté pour tous les visiteurs de la fiche film. |
| **Cause** | Aucune sanitization à l'enregistrement. Affichage frontend via `dangerouslySetInnerHTML={{ __html: r.content }}`. |
| **Exploitation** | 1. Se connecter. 2. Publier un avis : `<script>alert('XSS stocké')</script>`. 3. Tout visiteur de la page film exécute le script. |
| **Preuve** | **Requête :** `POST /api/reviews` body `{"movie_id":1,"content":"<script>alert(1)</script>"}`. **Affichage (vulnerable) :** alerte JS à chaque visite. **Affichage (secure) :** texte échappé `&lt;script&gt;...` via `sanitizeText()` + rendu `{r.content}`. |
| **Impact** | **Technique :** persistance du payload, attaque de tous les utilisateurs. **Métier :** vol massif de sessions, défacement, distribution de malware. |
| **Criticité** | Élevée |
| **Correction (branche secure)** | `sanitizeText()` dans `backend/src/utils/sanitize.js` à l'enregistrement. Affichage texte côté React. |
| **Validation** | Test unitaire `utils.test.js` — échappement `<script>`. Inspection code : pas de `dangerouslySetInnerHTML` sur les avis. |

---

## 6. Authentification faible

| Élément | Contenu |
|---------|---------|
| **Nom** | Authentification et gestion de session insuffisantes |
| **Type** | OWASP A07:2021 — Identification and Authentication Failures |
| **Endpoint ou zone concernée** | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/debug/config` — `middleware/auth.js`, `routes/auth.js`, `routes/debug.js` |
| **Description** | Multiples faiblesses : secret JWT prévisible, expiration 30 jours, bcrypt cost 4, pas de rate limiting, messages d'erreur révélateurs, endpoint debug exposant le secret. |
| **Cause** | Secret hardcodé `cinema-secret-key`, absence de `express-rate-limit`, configuration bcrypt minimale pour la démo, endpoint debug laissé actif. |
| **Exploitation** | 1. `curl /api/debug/config` → récupérer `jwt_secret`. 2. Forger un token admin. Ou : brute force illimité sur `/api/auth/login`. |
| **Preuve** | **Requête :** `GET /api/debug/config`. **Réponse (vulnerable) :** `{"jwt_secret":"cinema-secret-key","jwt_expires_in":"30d"}`. **Réponse (secure) :** `404`. Login : 100+ tentatives sans blocage (vulnerable) vs `429` après 10 tentatives (secure). |
| **Impact** | **Technique :** forge de JWT, brute force credentials, session longue durée. **Métier :** prise de contrôle comptes admin, fraude, accès illégitime au back-office. |
| **Criticité** | Élevée |
| **Correction (branche secure)** | `JWT_SECRET` obligatoire (32+ chars) via `.env`. Expiration 1h. bcrypt cost 12. Rate limit 10 req/15 min. Endpoint debug supprimé. |
| **Validation** | `GET /api/debug/config` → 404. Test login → message générique. Variable `JWT_SECRET` requise au démarrage. |

---

## 7. Mass assignment — élévation de privilège et fraude tarifaire

| Élément | Contenu |
|---------|---------|
| **Nom** | Mass Assignment — modification de champs sensibles |
| **Type** | OWASP A04:2021 — Insecure Design / API3:2023 — Broken Object Property Level Authorization |
| **Endpoint ou zone concernée** | `PATCH /api/users/me`, `POST /api/reservations` — `routes/users.js`, `routes/reservations.js` |
| **Description** | Le serveur accepte et applique des champs non prévus du body HTTP : `role`, `total_price`, `user_id`, `status`. |
| **Cause** | Fusion directe du body utilisateur dans l'objet persisté sans whitelist. Le prix total est lu depuis le client au lieu d'être recalculé serveur. |
| **Exploitation** | **Privilège :** `PATCH /api/users/me` avec `{"role":"admin"}`. **Fraude :** `POST /api/reservations` avec `"total_price": 0` pour une place adulte à 12 €. |
| **Preuve** | **Requête fraude :** `POST /api/reservations` `{"showtime_id":2,"seats":[{"seat_id":10,"ticket_type":"adulte"}],"total_price":0}`. **Réponse (vulnerable) :** `"total_price": 0`. **Réponse (secure) :** `"total_price": 12` (calcul serveur). **Privilège (vulnerable) :** `"role":"admin"` dans la réponse PATCH. **Secure :** `400` « Aucun champ autorisé ». |
| **Impact** | **Technique :** élévation de privilège, contournement logique métier. **Métier :** réservations gratuites, accès admin non autorisé, perte de revenus. |
| **Criticité** | Élevée |
| **Correction (branche secure)** | Whitelist : `email`, `bio` pour le profil. Réservation : seuls `showtime_id` et `seats` acceptés ; `total_price` calculé côté serveur via `getTicketPrice()`. |
| **Validation** | Test `utils.test.js` — `pickAllowed` filtre `role`. Test manuel : `total_price: 0` ignoré, prix recalculé. |

---

## 8. Misconfiguration et fuite d'informations

| Élément | Contenu |
|---------|---------|
| **Nom** | Security Misconfiguration & Information Disclosure |
| **Type** | OWASP A05:2021 — Security Misconfiguration |
| **Endpoint ou zone concernée** | `backend/src/index.js`, `routes/debug.js`, `routes/users.js`, `routes/movies.js`, `frontend/next.config.js` |
| **Description** | Stack traces exposées, CORS `*`, pas de headers de sécurité, endpoint debug, hash mot de passe retourné par l'API, `NODE_ENV` exposé sur `/api/health`. |
| **Cause** | Handler d'erreurs verbeux, configuration CORS permissive, absence de Helmet, endpoints de debug en production, sélection `SELECT *` incluant `password`. |
| **Exploitation** | 1. Provoquer une erreur SQLi → lire `stack` et `query` dans la réponse JSON. 2. `GET /api/users/1` → récupérer hash bcrypt. 3. `GET /api/debug/config` → secrets et chemins fichiers. |
| **Preuve** | **Requête :** `GET /api/users/1` (vulnerable). **Réponse :** inclut `"password":"$2a$04$..."`. **Secure :** champs limités, pas de password. Erreur 500 (secure, prod) : `{"error":"Erreur interne du serveur"}` sans stack. |
| **Impact** | **Technique :** facilite reconnaissance et chaînage d'attaques (SQLi, JWT forge). **Métier :** non-conformité, fuite d'architecture interne, accélération des intrusions. |
| **Criticité** | Moyenne à élevée |
| **Correction (branche secure)** | Helmet + CORS restreint (`CORS_ORIGIN`). Debug supprimé. Erreurs génériques en production. Champs API limités. CSP/X-Frame-Options sur Next.js. |
| **Validation** | `/api/debug/config` → 404. `/api/health` ne retourne plus `env`. Headers `X-Frame-Options`, `Content-Security-Policy` présents sur le frontend. |

---

## Méthodologie d'audit

1. **Revue de code** — analyse des routes backend et pages frontend sur la branche `vulnerable`.
2. **Tests manuels** — exploitation locale avec `curl` et navigateur.
3. **Comparaison** — vérification des corrections sur la branche `secure`.
4. **Automatisation** — tests dans `backend/tests/api.test.js`, pipeline `.github/workflows/security.yml`.

## Outils utilisés

| Phase | Outil |
|-------|-------|
| Exploitation | curl, navigateur (Chrome) |
| Correction | Revue de code, tests Node.js |
| Validation | `npm test`, Semgrep, npm audit, Gitleaks, OWASP ZAP baseline |
| CI/CD | GitHub Actions — voir [CI_CD.md](CI_CD.md) |

## Références

- [VULNERABILITIES.md](VULNERABILITIES.md) — guide d'exploitation (branche vulnerable)
- [SECURITY_FIXES.md](SECURITY_FIXES.md) — détail des corrections (branche secure)
- [CAPTURES.md](CAPTURES.md) — captures obligatoires pour le rapport
- [CI_CD.md](CI_CD.md) — pipeline de contrôles automatisés
