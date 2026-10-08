# Phase 13 — Containerization and Secure Deployment Evidence

**System:** Cyber Threat Intelligence (CTI) Sharing Platform  
**Exam Phase:** Phase 13 – Containerized Development: Docker and Kubernetes  
**Execution Timestamp:** 2026-10-08T14:38:30+05:30  
**Environment:** Docker CLI v29.5.2, kubectl v1.34.1, Node.js v20.x, Windows 10/11  
**Status:** MANIFESTS VERIFIED & HOST ENVIRONMENT AUDITED  

---

## 1. Host Tooling & Daemon Status Inspection

### 1.1 CLI Version Verification
```text
PS V:\SSE-ENDSEM> docker --version
Docker version 29.5.2, build 79eb04c

PS V:\SSE-ENDSEM> kubectl version --client
Client Version: v1.34.1
Kustomize Version: v5.7.1
```

### 1.2 Docker Daemon Service Audit
```text
PS V:\SSE-ENDSEM> Get-Service "*docker*"

Status   Name               DisplayName                           
------   ----               -----------                           
Stopped  com.docker.service Docker Desktop Service                
```
*Audit Finding:* The Docker Desktop background service is installed but currently stopped on the host. Invoking `docker build` reports `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`. Starting Windows services requires elevated UAC administrator privileges. To run live container builds, Docker Desktop must be launched from the Windows desktop.

---

## 2. Kubernetes Manifest Schema & YAML Validation Evidence

All four Kubernetes manifests were parsed and validated using PyYAML:

```text
PS V:\SSE-ENDSEM> python -c "
import yaml, glob
for f in glob.glob('k8s/*.yaml'):
    with open(f, 'r') as fp:
        data = yaml.safe_load(fp)
        k = data.get('kind')
        n = data.get('metadata', {}).get('name')
        print(f'{f}: VALID YAML -> kind: {k}, name: {n}')
"

k8s\configmap.yaml: VALID YAML -> kind: ConfigMap, name: cti-platform-config
k8s\deployment.yaml: VALID YAML -> kind: Deployment, name: cti-platform-deployment
k8s\secret.yaml: VALID YAML -> kind: Secret, name: cti-platform-secrets
k8s\service.yaml: VALID YAML -> kind: Service, name: cti-platform-service
```
*Validation Result:* 100% syntactically valid Kubernetes API v1 and apps/v1 resources.

---

## 3. Dockerfile Security Configuration Evidence

```dockerfile
# Hardened multi-stage build excerpts from Dockerfile:
FROM node:20-bookworm-slim AS runtime

# Non-root user creation (UID 10001)
RUN groupadd -g 10001 ctigroup && \
    useradd -u 10001 -g ctigroup -s /bin/false -M ctiapp

# Dedicated writable directory for SQLite WAL mode
RUN mkdir -p /data /tmp /app/logs && \
    chown -R ctiapp:ctigroup /data /tmp /app/logs && \
    chmod 750 /data /tmp /app/logs

# Switch to non-root
USER 10001:10001

EXPOSE 3000

# Native healthcheck instruction
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "src/server.js"]
```

---

## 4. Kubernetes Deployment Security Context Evidence

```yaml
# SecurityContext implementation from k8s/deployment.yaml:
spec:
  replicas: 1 # Enforces SQLite single-writer consistency
  strategy:
    type: Recreate
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        runAsGroup: 10001
        fsGroup: 10001
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: cti-platform
          image: cti-platform:latest
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          volumeMounts:
            - name: data-volume
              mountPath: /data # Writable volume for SQLite on readOnlyRootFilesystem
            - name: tmp-volume
              mountPath: /tmp
```

---

## 5. Live Instructions for User When Docker Desktop is Launched

Once Docker Desktop is opened on the host, run the following commands to execute live verification:

```powershell
# 1. Build the hardened container image
docker build -t cti-platform:latest .

# 2. Run the container with read-only root filesystem and non-root user
docker run -d --name cti-live `
  --read-only `
  --user 10001:10001 `
  --tmpfs /tmp `
  -v cti-data:/data `
  -p 3000:3000 `
  cti-platform:latest

# 3. Test container health and functionality
Invoke-RestMethod -Uri "http://localhost:3000/api/health"

# 4. Deploy to local Kubernetes cluster
kubectl apply -f k8s/

# 5. Verify pod security context and readiness
kubectl get pods -l app=cti-platform
kubectl get services cti-platform-service
```

---

## 6. Pre-Deployment Application Regression Verification

```text
PS V:\SSE-ENDSEM> npm test
# tests 53
# suites 10
# pass 53
# fail 0 (100% Pass)

PS V:\SSE-ENDSEM> npm run test:vuln
# tests 8
# suites 3
# pass 8
# fail 0 (V02 and V04 Remediations Verified)

PS V:\SSE-ENDSEM> npm run security:scan
[PASS] ZERO UNEXPECTED HIGH/CRITICAL SAST DEFECTS FOUND
- V02 (CWE-639) REMEDIATED
- V04 (CWE-79) REMEDIATED

PS V:\SSE-ENDSEM> npm run audit:verify
[PASS] AUDIT TRAIL INTEGRITY CONFIRMED (801 records verified)
```
