# Social Planner - Deployment Guide

## Prerequisites

- VPS with Ubuntu 22.04+ (minimum 2GB RAM, 2 vCPU)
- Domain name with DNS access
- Docker and Docker Compose installed

## Quick Start

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Log out and back in for group changes to take effect
```

### 2. Configure DNS

Create A records pointing to your server IP:

- `planner.yourdomain.com` → Server IP
- `api.planner.yourdomain.com` → Server IP
- `storage.planner.yourdomain.com` → Server IP

### 3. Deploy Application

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/social-planner-mcp.git
cd social-planner-mcp

# Copy and configure environment
cp .env.production.example .env
nano .env  # Fill in all values

# Generate Traefik auth password
# Install apache2-utils if needed: sudo apt install apache2-utils
htpasswd -nb admin your_password
# Copy the output to TRAEFIK_AUTH in .env

# Start the application
docker compose -f docker/docker-compose.yml up -d

# Run database migrations
docker compose -f docker/docker-compose.yml exec api \
  npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma

# Create MinIO bucket and set public read policy
docker compose -f docker/docker-compose.yml exec minio \
  mc alias set local http://localhost:9000 $S3_ACCESS_KEY $S3_SECRET_KEY
docker compose -f docker/docker-compose.yml exec minio \
  mc mb --ignore-existing local/planner-media
docker compose -f docker/docker-compose.yml exec minio \
  mc anonymous set download local/planner-media

# Seed database (optional - for demo data)
docker compose -f docker/docker-compose.yml exec api \
  node packages/database/prisma/seed.js
```

### 4. Verify Deployment

- Web app: `https://planner.yourdomain.com`
- API health: `https://api.planner.yourdomain.com/health`
- Traefik dashboard: `https://traefik.planner.yourdomain.com`

## CI/CD Setup (Automated Deployments)

The application uses GitHub Actions to automatically build and deploy on every push to `main`.

### 1. Create Deploy SSH Key

Generate a dedicated SSH key for GitHub Actions (not your personal key):

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-deploy-planner" -f ~/.ssh/planner-deploy -N ""

# Copy public key to server
ssh-copy-id -i ~/.ssh/planner-deploy.pub root@YOUR_SERVER_IP

# View private key (you'll add this to GitHub Secrets)
cat ~/.ssh/planner-deploy
```

### 2. Configure GitHub Secrets

Go to **GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name      | Value                                              |
| ---------------- | -------------------------------------------------- |
| `SERVER_HOST`    | Your server IP (e.g., `123.45.67.89`)              |
| `SERVER_SSH_KEY` | Contents of `~/.ssh/planner-deploy` (private key) |

### 3. Configure Server GHCR Authentication

On the production server, authenticate Docker to pull private images from GHCR:

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Create a GitHub Personal Access Token (PAT) with 'read:packages' scope:
# Go to: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# Create token with scope: read:packages

# Login to GHCR on server (replace with your values)
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Credentials are now saved in ~/.docker/config.json
```

### 4. Test the Pipeline

```bash
# Make a small change and push
git add .
git commit -m "test: Verify CI/CD pipeline"
git push origin main

# Watch the deployment at:
# GitHub → Actions → Build and Deploy workflow
```

Expected flow:

1. ✅ Build and Push Images (~2-3 min)
2. ✅ Deploy to Production (~30 sec)
3. ✅ Health check passes

### Rollback Procedure

If a deploy breaks production:

```bash
# SSH into server
ssh root@YOUR_SERVER_IP
cd /opt/social-planner

# See available image tags
docker images ghcr.io/raouldevries/social-planner-mcp/api

# Pull specific version using commit SHA from GitHub Actions
# Edit docker-compose.yml to use specific tag, e.g.:
# image: ghcr.io/raouldevries/social-planner-mcp/api:abc1234
docker compose pull api web
docker compose up -d api web

# Or revert to previous cached image (if still available)
docker compose up -d --no-pull
```

---

## Maintenance

### View Logs

```bash
# All services
docker compose -f docker/docker-compose.yml logs -f

# Specific service
docker compose -f docker/docker-compose.yml logs -f api
```

### Update Application

**With CI/CD (recommended):** Simply push to `main` and the pipeline handles everything.

**Manual update (if needed):**

```bash
cd /opt/social-planner

# Pull latest images from GHCR
docker compose pull api web

# Run migrations
docker compose run --rm api npx prisma migrate deploy

# Restart services
docker compose up -d api web
```

### Backup Database

```bash
# Create backup
docker compose -f docker/docker-compose.yml exec postgres \
  pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20240101.sql | docker compose -f docker/docker-compose.yml exec -T postgres \
  psql -U $DB_USER $DB_NAME
```

### Stop Application

```bash
docker compose -f docker/docker-compose.yml down
```

### Full Reset (deletes all data!)

```bash
docker compose -f docker/docker-compose.yml down -v
```

## Troubleshooting

### SSL Certificate Issues

```bash
# Check Traefik logs
docker compose -f docker/docker-compose.yml logs traefik

# Ensure ports 80 and 443 are open
sudo ufw allow 80
sudo ufw allow 443
```

### Database Connection Issues

```bash
# Check if postgres is healthy
docker compose -f docker/docker-compose.yml ps

# Check postgres logs
docker compose -f docker/docker-compose.yml logs postgres
```

### API Not Starting

```bash
# Check API logs
docker compose -f docker/docker-compose.yml logs api

# Verify environment variables
docker compose -f docker/docker-compose.yml exec api env
```

## Architecture

```
                    ┌─────────────────┐
                    │    Internet     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Traefik      │
                    │  (SSL + Proxy)  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼────────┐   ┌──────▼──────┐
│     Web       │   │      API        │   │   MinIO     │
│   (nginx)     │   │   (Express)     │   │  (Storage)  │
│   :80         │   │     :4000       │   │   :9000     │
└───────────────┘   └────────┬────────┘   └─────────────┘
                             │
                ┌────────────┼────────────┐
                │                         │
        ┌───────▼───────┐        ┌────────▼────────┐
        │   PostgreSQL  │        │     Redis       │
        │     :5432     │        │     :6379       │
        └───────────────┘        └─────────────────┘
```

## Resource Requirements

| Service    | RAM   | CPU | Storage |
| ---------- | ----- | --- | ------- |
| Traefik    | 128MB | 0.1 | -       |
| PostgreSQL | 512MB | 0.5 | 10GB+   |
| Redis      | 128MB | 0.1 | 1GB     |
| MinIO      | 256MB | 0.2 | 50GB+   |
| API        | 512MB | 0.5 | -       |
| Web        | 64MB  | 0.1 | -       |
| **Total**  | ~2GB  | 1.5 | 60GB+   |

Recommended VPS: 4GB RAM, 2 vCPU, 80GB SSD
