# GitLab CI/CD Pipeline Guide

This document explains the `.gitlab-ci.yml` pipeline configuration for the Hotel Booking REST API System.

## Pipeline Overview

The CI/CD pipeline has 3 stages:

1. **Test** - Runs unit tests, integration tests, and linting
2. **Build** - Builds Docker image
3. **Deploy** - Deploys to production server

---

## Stage 1: Test

### 1.1 Unit Tests (`test:unit`)
- **Trigger**: On every push to `main` or merge requests
- **What it does**:
  - Installs dependencies
  - Runs unit tests with coverage report
  - Generates coverage artifacts
- **Output**: Coverage report in `coverage/` directory

### 1.2 Integration Tests (`test:integration`)
- **Trigger**: On every push to `main` or merge requests
- **What it does**:
  - Starts MySQL and Redis services
  - Runs integration tests against real database
  - Non-critical (allowed to fail)
- **Note**: Will fail gracefully if services aren't available
- **Database credentials** (for testing only):
  - Username: `test_user`
  - Password: `test_pass`
  - Database: `test_db`

### 1.3 Code Quality (`test:lint`)
- **Trigger**: On every push to `main` or merge requests
- **What it does**:
  - Checks code formatting
  - Informational only (doesn't block pipeline)

---

## Stage 2: Build

### 2.1 Docker Image Build (`build:docker`)
- **Trigger**: Only on `main` branch, after all tests pass
- **What it does**:
  - Builds Docker image from `app/Dockerfile`
  - Image name: `final-project-api:latest`
  - Uses Docker-in-Docker service
- **Prerequisites**:
  - All tests must pass
  - Runner must have Docker support

---

## Stage 3: Deploy

### 3.1 Production Deployment (`deploy:production`)
- **Trigger**: Manual (requires user approval in GitLab UI)
- **Target**: Production server at `10.34.112.129`
- **Deployment path**: `/opt/apps/compose/final-project`

**What it does**:
1. Connects to server via SSH using deploy key
2. Navigates to deployment directory
3. Pulls latest code from `main` branch
4. Checks environment configuration files
5. Stops existing Docker containers
6. Builds and starts new containers
7. Runs database migrations
8. Verifies deployment with health check
9. Shows running containers

**Prerequisites**:
- Deploy SSH key must be configured in GitLab (see below)
- Server must have Docker and Docker Compose installed
- `.env.docker` file must exist on server
- Project must be cloned to `/opt/apps/compose/final-project`

### 3.2 Rollback (`deploy:rollback`)
- **Trigger**: Manual (requires user approval in GitLab UI)
- **What it does**:
  - Reverts to previous commit
  - Stops and restarts Docker containers
  - Useful for emergency rollbacks

---

## Setup Instructions

### 1. SSH Key Configuration

GitLab needs SSH keys to access the deployment server. Follow these steps:

#### Step 1: Generate SSH Key Pair (if not already done)
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/deploy_key_final-project -N ""
```

#### Step 2: Add Public Key to Server
On the deployment server, add your public key to the deploy user's authorized_keys:
```bash
# On your local machine
cat ~/.ssh/deploy_key_final-project.pub

# Then on the server
echo "<public_key_content>" >> /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

#### Step 3: Add Private Key to GitLab CI/CD Variables
1. Go to your GitLab project
2. Navigate to **Settings** → **CI/CD** → **Variables**
3. Create a new variable:
   - **Key**: `DEPLOY_SSH_KEY`
   - **Value**: (paste the content of `~/.ssh/deploy_key_final-project`)
   - **Protected**: Yes (only on main branch)
   - **Masked**: Yes

#### Step 4: Update GitLab Runner Configuration (if needed)
Make sure your GitLab runner has access to the SSH keys. Runners execute the pipeline jobs.

---

### 2. Server Setup

Before deploying, ensure the server has:

#### Required Software
- Docker Engine (20.10+)
- Docker Compose (2.0+)
- Git
- SSH server

#### Deployment Directory
```bash
sudo mkdir -p /opt/apps/compose/final-project
sudo chown deploy:deploy /opt/apps/compose/final-project
```

#### Clone Repository
```bash
cd /opt/apps/compose/final-project
git clone git@gitlab-final-project:Nanthit/final-project.git .
```

#### Environment Files
Create the required `.env` files on the server:
```bash
# For Docker-based backend
cp app/.env.docker.example app/.env.docker
# Edit with server values

# For Docker Compose infrastructure
cp infra/.env.example infra/.env
# Edit with server values
```

---

### 3. GitLab Project Configuration

#### Variables to Configure (in GitLab UI)
- Navigate to **Settings** → **CI/CD** → **Variables**

| Variable | Value | Protected | Masked |
|----------|-------|-----------|--------|
| `DEPLOY_SSH_KEY` | Private key content | Yes | Yes |
| `DEPLOY_USER` | `deploy` | Yes | No |

---

## Manual Deployment

If automatic deployment doesn't work, you can deploy manually:

```bash
cd /opt/apps/compose/final-project

# Pull latest code
git pull origin main

# Start services
cd infra
docker-compose up --build -d

# Run migrations
docker-compose exec app npx prisma db push

# Verify
curl http://localhost:3000/health
```

---

## Monitoring the Pipeline

### In GitLab UI:
1. Go to **CI/CD** → **Pipelines**
2. Click on a pipeline to see stages and jobs
3. Click on a job to see real-time logs
4. Failed jobs show errors in red

### Job Artifacts:
- Coverage reports are saved for 30 days
- Access via **Pipelines** → **Job artifacts**

---

## Troubleshooting

### Pipeline Fails at Test Stage
- Check test logs for errors
- Ensure MySQL/Redis services start correctly
- Verify database schema with `npx prisma db push`

### Build Fails
- Check Docker build logs
- Ensure `app/Dockerfile` is correct
- Verify dependencies are installed

### Deployment Fails
**Common Issues:**

1. **SSH Connection Refused**
   - Verify SSH key is added to server
   - Check server IP and port
   - Ensure `deploy` user exists

2. **Permission Denied**
   - Verify `deploy` user owns `/opt/apps/compose/final-project`
   - Check SSH key permissions (should be 600)

3. **Docker Not Running**
   - SSH into server and check: `systemctl status docker`
   - Verify user is in docker group: `id deploy`

4. **Health Check Failed**
   - Check container logs: `docker-compose logs app`
   - Verify environment variables
   - Check database connectivity

### Manual Job Execution

If you need to trigger deployment manually:
1. Go to **CI/CD** → **Pipelines**
2. Click the pipeline
3. Find `deploy:production` job
4. Click **Play** button (▶️)

---

## Security Considerations

⚠️ **Important:**
- Never commit `.env` files to Git
- SSH keys should be added as CI/CD variables, not in code
- Use `Protected` and `Masked` flags for sensitive variables
- Deploy user should have minimal required permissions
- Regularly rotate SSH keys

---

## Next Steps

Once the CI/CD pipeline is working:

1. **Monitor Deployments**: Check GitLab pipelines and server logs
2. **Set Up Alerts**: Configure Slack/Email notifications for failures
3. **Document Changes**: Keep deployment notes in CHANGELOG
4. **Regular Testing**: Run manual tests after each deployment

---

## References

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [NestJS Deployment Guide](https://docs.nestjs.com/deployment)
