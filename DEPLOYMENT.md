# Déploiement du portfolio

Cette configuration sépare le frontend React/Vite (Vercel), l’API FastAPI (Render) et PostgreSQL (Neon). Les plateformes ne sont pas encore reliées à un dépôt ou à des comptes : ce guide prépare les fichiers et les étapes, mais ne publie pas l’application.

### Ordre du premier déploiement

Pour obtenir l’origine exacte à saisir dans Render, procéder ainsi : créer d’abord la base Neon, puis créer le projet Vercel et effectuer un premier déploiement pour obtenir son domaine `*.vercel.app`. L’API ne sera pas encore connectée pendant cette étape. Utiliser ensuite ce domaine dans `FRONTEND_ORIGINS` lors de la création du Blueprint Render. Une fois l’URL Render connue, ajouter `VITE_API_URL` dans Vercel et redéployer le frontend.

## 1. Préparer le dépôt

1. Créer un dépôt Git privé sur GitHub et y pousser le projet.
2. Vérifier que `.env`, `backend/.env`, `node_modules/`, `dist/` et `backend/.venv/` ne sont pas suivis par Git. Le `.gitignore` du projet les exclut.
3. Ne jamais mettre `DATABASE_URL` ou `SECRET_KEY` dans une variable `VITE_*` : les variables Vite sont intégrées au JavaScript public.

## 2. Créer la base Neon

1. Créer un projet PostgreSQL Neon et choisir une région proche de Frankfurt.
2. Dans **Connect**, copier la chaîne de connexion PostgreSQL. Pour l’API persistante Render, utiliser l’option pooled proposée par Neon et garder le paramètre TLS/SSL fourni (`sslmode=require`). Le backend accepte les préfixes `postgres://` et `postgresql://`.
3. Garder cette chaîne privée : elle sera saisie comme `DATABASE_URL` dans Render, jamais dans Vercel.

Neon fournit une chaîne de connexion dédiée et un endpoint poolé via l’option de connexion. [Guide Neon sur le pooling](https://neon.com/blog/postgres-support-case-recap)

## 3. Déployer l’API sur Render

1. Depuis le tableau de bord Render, créer un **Blueprint** depuis le dépôt GitHub. Render détectera `render.yaml` à la racine.
2. Fournir `DATABASE_URL` avec la chaîne Neon et `FRONTEND_ORIGINS` avec l’origine Vercel exacte, par exemple `https://mon-portfolio.vercel.app` (sans chemin ni slash final). Ajouter aussi `IMAGEKIT_PRIVATE_KEY` et `IMAGEKIT_PUBLIC_KEY` depuis ImageKit, ainsi que `DEEPL_API_KEY` depuis DeepL; conserver les clés privées comme secrets.
3. Le manifeste choisit explicitement le forfait gratuit `free`, génère `SECRET_KEY`, active `APP_ENV=production`, exécute les migrations Alembic au démarrage puis lance Uvicorn sur le port fourni par Render.
4. Une fois le service prêt, vérifier `https://<api-render>/health` : la réponse attendue est `{"status":"ok"}`. La documentation `/docs` est désactivée en production.

Le forfait Render gratuit ne facture pas le service, mais met l’API en veille après 15 minutes sans trafic; son réveil peut prendre environ une minute. Il convient pour les essais et un portfolio personnel à petit trafic, mais pas pour une API qui doit rester disponible sans interruption. Vérifie aussi les limites et éventuels dépassements d’usage dans le tableau de bord Render. [Limites des services gratuits](https://render.com/docs/free)

Le manifeste lance les migrations avant chaque démarrage. Garder un seul exemplaire de l’API pendant les premiers déploiements. Pour un déploiement Render payant avec plusieurs instances, déplacer `alembic upgrade head` dans `preDeployCommand`, prévu par Render pour les tâches de migration. [Référence officielle du Blueprint Render](https://render.com/docs/blueprint-spec)

## 4. Déployer le frontend sur Vercel

1. Créer un projet Vercel depuis le même dépôt, avec le **Root Directory** à la racine du dépôt, puis lancer un premier déploiement pour obtenir le domaine `*.vercel.app`. L’API n’est pas encore reliée à cette étape.
2. Après la création du service Render, ajouter les variables suivantes dans **Settings → Environment Variables** pour Production :

   | Variable | Valeur |
   | --- | --- |
   | `VITE_API_URL` | `https://<api-render>/api/v1` |
   | `VITE_FORMSPREE_ENDPOINT` | `https://formspree.io/f/xnpdodwg` |

3. Redéployer après avoir enregistré les variables. `vercel.json` lance `npm run build`, publie `dist` et redirige les routes SPA comme `/admin/login` vers l’application React.
4. Si le domaine Vercel change, mettre à jour `FRONTEND_ORIGINS` sur Render puis redéployer l’API.

Vercel documente les commandes de build, le répertoire de sortie et les réécritures SPA dans sa configuration projet. [Configuration `vercel.json`](https://vercel.com/docs/project-configuration/vercel-json), [guide Vite sur Vercel](https://vercel.com/docs/frameworks/frontend/vite)

## 5. Créer l’administrateur de production

Après la première migration Neon, créer le compte administrateur. Depuis PowerShell, dans `backend/`, saisir la chaîne Neon au prompt au lieu de la coller dans une commande enregistrée dans l’historique :

```powershell
$env:DATABASE_URL = Read-Host "Colle la chaîne de connexion Neon"
python -m app.scripts.create_admin
Remove-Item Env:DATABASE_URL
```

Le script demande l’adresse, le nom et un mot de passe d’au moins 12 caractères. Il ne crée pas de route publique d’inscription. Ensuite, se connecter sur `https://<frontend-vercel>/admin/login`.

## Variables d’environnement

### Render

| Variable | Type | Description |
| --- | --- | --- |
| `APP_ENV` | valeur | `production` ; désactive Swagger et active les cookies sécurisés |
| `DATABASE_URL` | secret | Connexion PostgreSQL Neon avec TLS |
| `SECRET_KEY` | secret généré | Render le génère depuis `render.yaml`; ne pas le remplacer par une valeur de développement |
| `FRONTEND_ORIGINS` | valeur privée | Origines web exactes séparées par des virgules |
| `SESSION_TTL_HOURS` | valeur | Durée de session admin, `12` par défaut |
| `COOKIE_NAME` | valeur | `portfolio_session` |
| `IMAGEKIT_PRIVATE_KEY` | secret | Clé privée ImageKit, uniquement côté backend |
| `IMAGEKIT_PUBLIC_KEY` | valeur publique | Clé publique ImageKit utilisée pour le téléversement |
| `DEEPL_API_KEY` | secret | Clé API DeepL utilisée pour générer les traductions EN |

### Vercel

| Variable | Type | Description |
| --- | --- | --- |
| `VITE_API_URL` | publique | URL de base de l’API, terminant par `/api/v1` |
| `VITE_FORMSPREE_ENDPOINT` | publique | Endpoint du formulaire Formspree |

Les variables Vite sont publiques et sont figées au moment du build. Aucun identifiant de base de données ni secret serveur ne doit commencer par `VITE_`.

## Vérification après déploiement

- Ouvrir le portfolio et `/admin/login`; tester la connexion, le rafraîchissement puis la déconnexion.
- Dans l’admin, créer et publier une compétence ou un projet, puis confirmer son affichage côté public dans les deux langues.
- Envoyer un message avec le formulaire; vérifier sa présence dans l’inbox admin et la réception de la notification Formspree. Vérifier le destinataire/notification dans le tableau de bord Formspree.
- Confirmer que les appels API depuis le domaine frontend passent CORS. `FRONTEND_ORIGINS` doit contenir exactement chaque origine de production autorisée.
- Les cookies de session sont `Secure` et `SameSite=None` en production. Pour limiter les blocages des cookies tiers, privilégier des domaines personnalisés sous le même domaine racine (par exemple `portfolio.example.com` et `api.example.com`).

La base Neon ne reçoit pas automatiquement les données de PostgreSQL local. Elle démarre vide après les migrations; ajouter le profil et les contenus depuis l’admin ou prévoir une migration de données séparée avant la mise en ligne.
