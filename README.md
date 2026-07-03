# CinémaBook — Plateforme de réservation (version sécurisée)

Application web de réservation de places de cinéma avec corrections de sécurité appliquées.

## Fonctionnalités

- Authentification (inscription / connexion)
- Rôles `user` et `admin`
- Catalogue de films avec recherche
- Réservation de places (une ou plusieurs)
- Tarifs : enfant (6 €), étudiant (8 €), adulte (12 €)
- Avis sur les films
- Panneau d'administration (accès admin uniquement)

## Prérequis

- Node.js 20+
- npm

## Installation

```bash
# Backend
cd backend
cp .env.example .env
# Modifier JWT_SECRET dans .env (minimum 32 caractères)
npm install
npm run seed
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

## Sécurité

Cette branche corrige toutes les vulnérabilités de la branche `vulnerable` :

- Contrôle d'ownership (IDOR/BOLA)
- Requêtes SQL paramétrées
- Protection XSS (sanitization + CSP)
- Auth renforcée (rate limiting, JWT court, bcrypt 12)
- Mass assignment bloqué
- Headers de sécurité (Helmet, CSP)
- CORS restreint
- Pas d'endpoint debug ni de stack traces en production

Voir [docs/SECURITY_FIXES.md](docs/SECURITY_FIXES.md) pour le détail des corrections.

Les vulnérabilités originales restent documentées dans [docs/VULNERABILITIES.md](docs/VULNERABILITIES.md) (référence pédagogique).

## Branches

- `vulnerable` — version avec failles intentionnelles
- `secure` — version corrigée (branche actuelle)
- Pipeline CI/CD sécurité — à venir

## Structure

```
backend/     # API REST Express + SQLite (sécurisée)
frontend/    # Interface Next.js (App Router)
docs/        # VULNERABILITIES.md + SECURITY_FIXES.md
```
