## 1. Compilation manuelle du backend

Pour vérifier la compilation TypeScript du backend :

```bash
cd backend
npx tsc -p tsconfig.json
```

---

## 2. Lancement en développement (base + Adminer)

```bash
docker compose -f docker-compose.dev.yml up 
```

- **Base PostgreSQL** : port 5432
- **Adminer** : http://localhost:8081

---

## 3. Lancement en production (stack complète)

```bash
docker compose -f docker-compose.prod.yml up --build
```

- **Frontend Angular (Nginx)** : https://localhost:8080
- **Backend Node.js (Express + HTTPS)** : https://localhost:4000/api/public
- **Adminer** : http://localhost:8081

---

### 4. Lancement combiné

Vous pouvez lancer tous les services (dev + prod) en une seule commande :

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.prod.yml up --build
```

---


## 5. Identifiants de connexion

- **Utilisateur admin** :
  - **Username** : `admin`
  - **Password** : `admin`
- **Utilisateur standard (Non admin)** :
  - **Username** : `newuser`
  - **Password** : `Password123!`

*Connectez-vous directement via le formulaire du frontend (aucun besoin de curl).*

---

