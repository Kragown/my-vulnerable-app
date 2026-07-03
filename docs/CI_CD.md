# Pipeline CI/CD Sécurité

Pipeline GitHub Actions automatique sur la branche `secure` (et `main`).

## Fichier

`.github/workflows/security.yml`

## Déclencheurs

- `push` sur `secure` ou `main`
- `pull_request` vers `secure` ou `main`

## Jobs

| Job | Outil | Objectif |
|-----|-------|----------|
| **test** | `npm test` + build | Vérifier que l'application fonctionne |
| **sast** | Semgrep | Analyse statique du code source |
| **sca** | `npm audit` | Audit des dépendances (échec si high/critical) |
| **secrets** | Gitleaks | Détection de secrets exposés |
| **dast** | OWASP ZAP baseline | Test dynamique de l'API en cours d'exécution |

## Règles

La pipeline **échoue** si :

- Un test applicatif échoue
- Semgrep détecte une règle ERROR
- `npm audit` trouve une vulnérabilité **high** ou **critical**
- Gitleaks détecte un secret
- OWASP ZAP baseline signale des alertes critiques

## Exécution locale

```bash
# Tests
cd backend && npm test
cd frontend && npm test

# Audit dépendances
cd backend && npm audit --audit-level=high
cd frontend && npm audit --audit-level=high

# Semgrep (si installé)
semgrep --config p/javascript --config p/nodejs --config .semgrep.yml .

# Gitleaks (si installé)
gitleaks detect --source . --config .gitleaks.toml
```

## Variables CI

| Variable | Usage |
|----------|-------|
| `JWT_SECRET` | Secret de test pour les jobs CI (32+ caractères) |
| `NODE_ENV` | `test` pendant les tests |
| `CORS_ORIGIN` | `http://localhost:3000` |
