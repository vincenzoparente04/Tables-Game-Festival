

## Deployment Guides

### 1. Local Development (using Docker)

**Start the application:**
```bash
git checkout ahmed
docker compose -f docker-compose.dev.yml down -v  # Clean slate
docker compose -f docker-compose.dev.yml up --build
```

**Access the application:**
- **Frontend**: https://localhost:8080
- **Backend API**: https://localhost:4000/api
- **Database Admin**: http://localhost:8081 (Adminer)

**Login credentials:**
- Admin: `admin` / `admin`
- Database: `secureapp` / `secureapp`


---

### 2. Production Deployment (on School VM)

#### Just want to access the app?
If the app is already running on the VM and you're connected to the school VPN, simply visit:
- **Frontend**: https://162.38.111.34:8080
- **Database Admin**: http://162.38.111.34:8081 (Adminer)


---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.dev.yml` | Local development stack (uses `localhost:8080`) |
| `docker-compose.prod.yml` | Production stack on VM (uses `162.38.111.34:8080`) |

---

