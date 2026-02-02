# Deployment Setup

## Required GitHub Secrets

Add these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

1. **DOCKER_HUB_LOGIN_TOKEN**: Your Docker Hub access token
2. **PORTAINER_TOKEN**: Your Portainer API key
3. **PORTAINER_STACK_ID**: The ID of your stack in Portainer (e.g., `25`)
4. **PORTAINER_ENDPOINT_ID**: Your Portainer endpoint ID (e.g., `2`)

## Docker Hub Setup

1. Create a Docker Hub repository: `pinkynrg/lazy-cook`
2. Generate an access token from Docker Hub settings

## Portainer Setup

1. Create a new stack in Portainer
2. Use this docker-compose configuration:

```yaml
version: '3.8'

services:
  app:
    image: pinkynrg/lazy-cook:latest
    container_name: lazy-cook
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
```

3. Note the stack ID and endpoint ID for GitHub secrets

## Manual Deployment

Build and push manually:
```bash
docker build -t pinkynrg/lazy-cook:latest .
docker push pinkynrg/lazy-cook:latest
```

## Notes

- Database persists in `/app/data` volume
- Automatic deployment on push to main branch
- Uses Next.js standalone output for optimized Docker image
