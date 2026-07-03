# CinémaBook — Plateforme de réservation (version vulnérable)

Application web de réservation de places de cinéma, **volontairement vulnérable**, développée dans le cadre d'un projet de sécurité applicative.

> **Usage local uniquement.** Ne jamais exposer cette version sur Internet.

## Fonctionnalités

- Authentification (inscription / connexion)
- Rôles `user` et `admin`
- Catalogue de films avec recherche
- Réservation de places (une ou plusieurs)
- Tarifs : enfant (6 €), étudiant (8 €), adulte (12 €)
- Avis sur les films
- Panneau d'administration

## Prérequis

- Node.js 20+
- npm

## Installation

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run seed    # optionnel : réinitialise la base de données
npm run dev     # http://localhost:3001

# Frontend (autre terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev     # http://localhost:3000
```

## Comptes de démonstration

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `user@demo.local` | `password` | user |
| `admin@demo.local` | `password` | admin |

## Parcours utilisateur

1. Se connecter avec un compte démo
2. Parcourir les films sur `/movies`
3. Choisir un film → sélectionner une séance → réserver des places
4. Consulter ses réservations sur `/reservations`

## Vulnérabilités documentées

Voir [docs/VULNERABILITIES.md](docs/VULNERABILITIES.md) pour la liste complète avec étapes d'exploitation :

| Type | Exemple dans l'app |
|------|-------------------|
| IDOR / BOLA | Accès aux réservations d'autrui |
| Injection SQL | Recherche de films |
| XSS | Avis films (stocké), erreur login (réfléchi) |
| Auth faible | JWT prévisible, pas de rate limit |
| Mass Assignment | Modification du rôle, prix à 0 € |
| Misconfiguration | Debug endpoint, stack traces |

## Structure du projet

```
backend/     # API REST Express + SQLite
frontend/    # Interface Next.js (App Router)
docs/        # Documentation des vulnérabilités
```

## Branches

- `vulnerable` — version actuelle avec failles intentionnelles
- `secure` — corrections (à venir)
- Pipeline CI/CD sécurité — après la branche `secure`

## API principale

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/register` | Inscription |
| GET | `/api/movies` | Liste des films |
| GET | `/api/movies/search?q=` | Recherche |
| GET | `/api/showtimes` | Séances |
| GET | `/api/showtimes/:id/seats` | Places disponibles |
| POST | `/api/reservations` | Créer une réservation |
| GET | `/api/reservations/:id` | Détail réservation |
| POST | `/api/reviews` | Publier un avis |
| GET | `/api/admin/stats` | Statistiques |
| GET | `/api/debug/config` | Config exposée |
