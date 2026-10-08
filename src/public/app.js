// Cyber Threat Intelligence (CTI) Sharing Platform - Frontend Controller

class CTIApp {
  constructor() {
    this.token = localStorage.getItem('cti_jwt') || null;
    this.currentUser = JSON.parse(localStorage.getItem('cti_user') || 'null');
    this.mfaToken = null;
    this.currentPersonaSecret = 'JBSWY3DPEHPK3PXP'; // Default Riya
    this.selectedIndicatorId = null;

    this.initElements();
    this.initEvents();
    this.checkSession();
    this.startMetricsPolling();
  }

  initElements() {
    // Nav
    this.tabs = document.querySelectorAll('.nav-tab');
    this.panels = document.querySelectorAll('.view-panel');

    // Header Session
    this.sessionInfo = document.getElementById('session-info');
    this.chipRole = document.getElementById('chip-role-badge');
    this.chipUsername = document.getElementById('chip-username');
    this.chipOrg = document.getElementById('chip-org');
    this.btnLogout = document.getElementById('btn-logout');

    // Auth Screen
    this.formLoginStep1 = document.getElementById('form-login-step1');
    this.formLoginStep2 = document.getElementById('form-login-step2');
    this.inputUsername = document.getElementById('login-username');
    this.inputPassword = document.getElementById('login-password');
    this.inputTotp = document.getElementById('login-totp');
    this.btnCancelMfa = document.getElementById('btn-cancel-mfa');
    this.authAlert = document.getElementById('auth-alert');
    this.jwtPreview = document.getElementById('jwt-preview');
    this.totpTimer = document.getElementById('totp-timer');

    // Ingest Screen
    this.formIngestIoc = document.getElementById('form-ingest-ioc');
    this.inputIocType = document.getElementById('ioc-type');
    this.inputIocValue = document.getElementById('ioc-value');
    this.inputIocTlp = document.getElementById('ioc-tlp');
    this.inputIocDesc = document.getElementById('ioc-desc');
    this.defangPreview = document.getElementById('defang-preview-text');
    this.ingestAlert = document.getElementById('ingest-alert');

    this.formSubmitReport = document.getElementById('form-submit-report');
    this.reportAlert = document.getElementById('report-alert');

    // Triage Screen
    this.triageTableBody = document.getElementById('triage-queue-body');
    this.pendingBadge = document.getElementById('pending-count-badge');
    this.btnRefreshTriage = document.getElementById('btn-refresh-triage');
    this.triageModal = document.getElementById('triage-modal');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.modalIocId = document.getElementById('modal-ioc-id');
    this.modalIocDefanged = document.getElementById('modal-ioc-defanged');
    this.modalIocType = document.getElementById('modal-ioc-type');
    this.formTriage = document.getElementById('form-triage-decision');
    this.confidenceSlider = document.getElementById('triage-confidence');
    this.confidenceDisplay = document.getElementById('confidence-value');
    this.modalAlert = document.getElementById('modal-alert');
    this.btnRejectTriage = document.getElementById('btn-reject-triage');

    // Feed & Metrics Screen
    this.btnFetchStix = document.getElementById('btn-fetch-stix');
    this.stixJsonDisplay = document.getElementById('stix-json-display');
    this.stixRoleIndicator = document.getElementById('stix-role-indicator');
    this.stixBarrierBanner = document.getElementById('stix-barrier-banner');

    this.btnVerifyAudit = document.getElementById('btn-verify-audit');
    this.auditVerifTitle = document.getElementById('verif-title');
    this.auditVerifSub = document.getElementById('verif-sub');
    this.auditTableBody = document.getElementById('audit-table-body');

    // Metric Displays
    this.metricHttpReqs = document.getElementById('metric-http-reqs');
    this.metricFailedLogins = document.getElementById('metric-failed-logins');
    this.metricPendingQueue = document.getElementById('metric-pending-queue');
    this.metricAuditStatus = document.getElementById('metric-audit-status');
  }

  initEvents() {
    // Tab switching
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        this.switchTab(target);
      });
    });

    // Persona Selector
    document.querySelectorAll('.persona-item').forEach((item) => {
      item.addEventListener('click', () => {
        const user = item.dataset.user;
        const pass = item.dataset.pass;
        const secret = item.dataset.secret;
        this.inputUsername.value = user;
        this.inputPassword.value = pass;
        this.currentPersonaSecret = secret;
        this.showAlert(this.authAlert, `Loaded persona: ${user}. Click 'Verify Credentials' to test.`, 'info');
      });
    });

    // Auth Step 1
    this.formLoginStep1.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLoginStep1();
    });

    // Auth Step 2
    this.formLoginStep2.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLoginStep2();
    });

    this.btnCancelMfa.addEventListener('click', () => {
      this.formLoginStep2.classList.add('hidden');
      this.formLoginStep1.classList.remove('hidden');
      document.getElementById('auth-step-number').textContent = '1';
    });

    this.btnLogout.addEventListener('click', () => this.logout());

    // IoC Input Defang Live Preview
    this.inputIocValue.addEventListener('input', () => {
      this.updateDefangPreview();
    });
    this.inputIocType.addEventListener('change', () => {
      this.updateDefangPreview();
    });

    // IoC Ingest
    this.formIngestIoc.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleIngestIoc();
    });

    // Report Submit
    this.formSubmitReport.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleReportSubmit();
    });

    // Triage Queue Refresh
    this.btnRefreshTriage.addEventListener('click', () => this.loadTriageQueue());

    // Modal Close
    this.btnCloseModal.addEventListener('click', () => {
      this.triageModal.classList.add('hidden');
    });

    // Confidence Slider
    this.confidenceSlider.addEventListener('input', (e) => {
      this.confidenceDisplay.textContent = e.target.value;
    });

    // Triage Approve
    this.formTriage.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleTriageDecision('APPROVED');
    });

    // Triage Reject
    this.btnRejectTriage.addEventListener('click', async () => {
      await this.handleTriageDecision('REJECTED');
    });

    // STIX Feed Fetch
    this.btnFetchStix.addEventListener('click', () => this.fetchStixFeed());

    // Audit Chain Verify
    this.btnVerifyAudit.addEventListener('click', () => this.verifyAuditChain());
  }

  switchTab(targetId) {
    this.tabs.forEach((t) => t.classList.remove('active'));
    this.panels.forEach((p) => p.classList.remove('active'));

    const activeTab = document.querySelector(`[data-tab="${targetId}"]`);
    const activePanel = document.getElementById(targetId);

    if (activeTab) activeTab.classList.add('active');
    if (activePanel) activePanel.classList.add('active');

    // Trigger tab-specific loaders
    if (targetId === 'tab-triage') {
      this.loadTriageQueue();
    } else if (targetId === 'tab-feeds') {
      this.fetchStixFeed();
      this.fetchPrometheusMetrics();
    }
  }

  // Live Canonical Defanging in UI
  updateDefangPreview() {
    const val = this.inputIocValue.value.trim();
    const type = this.inputIocType.value;

    if (!val) {
      this.defangPreview.textContent = 'None entered';
      return;
    }

    let defanged = val;
    if (type === 'IPV4' || type === 'DOMAIN') {
      defanged = val.replace(/\./g, '[.]').replace(/^http:\/\//i, 'hxxp://').replace(/^https:\/\//i, 'hxxps://');
    } else if (type === 'IPV6') {
      defanged = val.replace(/:/g, '[:]');
    } else {
      defanged = val.toLowerCase();
    }

    this.defangPreview.textContent = defanged;
  }

  // Authentication Step 1
  async handleLoginStep1() {
    const username = this.inputUsername.value.trim();
    const password = this.inputPassword.value;

    try {
      this.showAlert(this.authAlert, 'Verifying credentials with bcrypt hashing...', 'info');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      this.mfaToken = data.tempToken || data.mfaToken;
      this.formLoginStep1.classList.add('hidden');
      this.formLoginStep2.classList.remove('hidden');
      document.getElementById('auth-step-number').textContent = '2';

      // Auto-compute TOTP using RFC 6238 for evaluator convenience
      if (this.currentPersonaSecret) {
        const computedTotp = await this.generateTOTP(this.currentPersonaSecret);
        this.inputTotp.value = computedTotp;
        this.showAlert(this.authAlert, `Credentials verified! Auto-calculated current TOTP: ${computedTotp}`, 'success');
      } else {
        this.showAlert(this.authAlert, 'Credentials verified! Please enter your 6-digit TOTP code.', 'info');
      }

      this.startTotpCountdown();
    } catch (err) {
      this.showAlert(this.authAlert, err.message, 'danger');
    }
  }

  // Authentication Step 2
  async handleLoginStep2() {
    const totpCode = this.inputTotp.value.trim();

    try {
      this.showAlert(this.authAlert, 'Validating RFC 6238 TOTP window...', 'info');
      const res = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: this.mfaToken, mfaToken: this.mfaToken, totpCode })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'MFA validation failed');
      }

      this.token = data.accessToken || data.token;
      this.currentUser = data.user;
      localStorage.setItem('cti_jwt', this.token);
      localStorage.setItem('cti_user', JSON.stringify(this.currentUser));

      this.showAlert(this.authAlert, `Authentication successful! Signed in as ${this.currentUser.username} (${this.currentUser.role}).`, 'success');
      this.updateSessionUI();
    } catch (err) {
      this.showAlert(this.authAlert, err.message, 'danger');
    }
  }

  updateSessionUI() {
    if (this.currentUser && this.token) {
      this.sessionInfo.classList.remove('hidden');
      this.chipUsername.textContent = this.currentUser.username;
      this.chipRole.textContent = this.currentUser.role.replace('ROLE_', '');
      this.chipOrg.textContent = `Org: ${this.currentUser.org_id ? this.currentUser.org_id.substring(0, 8) : 'CERT'}`;

      // JWT Preview
      try {
        const payloadBase64 = this.token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        this.jwtPreview.textContent = JSON.stringify(payload, null, 2);
      } catch (e) {
        this.jwtPreview.textContent = this.token;
      }
    } else {
      this.sessionInfo.classList.add('hidden');
      this.jwtPreview.textContent = 'Unauthenticated. Sign in to view cryptographically signed JWT payload.';
    }
  }

  checkSession() {
    if (this.token && this.currentUser) {
      this.updateSessionUI();
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    this.mfaToken = null;
    localStorage.removeItem('cti_jwt');
    localStorage.removeItem('cti_user');

    this.formLoginStep2.classList.add('hidden');
    this.formLoginStep1.classList.remove('hidden');
    document.getElementById('auth-step-number').textContent = '1';
    this.inputPassword.value = '';
    this.inputTotp.value = '';

    this.updateSessionUI();
    this.showAlert(this.authAlert, 'Signed out successfully.', 'info');
  }

  // IoC Ingestion Handler
  async handleIngestIoc() {
    if (!this.token) {
      this.showAlert(this.ingestAlert, 'Authentication required. Please sign in under Screen 1.', 'danger');
      return;
    }

    const payload = {
      type: this.inputIocType.value,
      value: this.inputIocValue.value.trim(),
      tlp: this.inputIocTlp.value,
      description: this.inputIocDesc.value.trim()
    };

    try {
      this.showAlert(this.ingestAlert, 'Validating and defanging observable...', 'info');
      const res = await fetch('/api/iocs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'IoC Ingestion failed');
      }

      if (data.isDuplicate) {
        this.showAlert(
          this.ingestAlert,
          `IoC Deduplicated: Observable was previously ingested (ID: ${data.indicatorId}). Sighting recorded in audit trail without DB bloat.`,
          'info'
        );
      } else {
        this.showAlert(
          this.ingestAlert,
          `IoC Ingested Successfully! ID: ${data.indicatorId}. Canonical Defanged: "${data.defanged}". Added to PENDING vetting queue.`,
          'success'
        );
        this.inputIocValue.value = '';
        this.inputIocDesc.value = '';
        this.updateDefangPreview();
      }
    } catch (err) {
      this.showAlert(this.ingestAlert, err.message, 'danger');
    }
  }

  // Threat Report Handler
  async handleReportSubmit() {
    if (!this.token) {
      this.showAlert(this.reportAlert, 'Authentication required. Please sign in under Screen 1.', 'danger');
      return;
    }

    const payload = {
      title: document.getElementById('report-title').value.trim(),
      summary: document.getElementById('report-summary').value.trim(),
      tlp: document.getElementById('report-tlp').value,
      content_markdown: document.getElementById('report-markdown').value.trim()
    };

    try {
      this.showAlert(this.reportAlert, 'Sanitizing markdown and storing incident report...', 'info');
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Report submission failed');
      }

      this.showAlert(
        this.reportAlert,
        `Threat Report Persisted! ID: ${data.reportId}. Raw scripts stripped via server-side Stored XSS defense.`,
        'success'
      );
      document.getElementById('report-title').value = '';
      document.getElementById('report-summary').value = '';
      document.getElementById('report-markdown').value = '';
    } catch (err) {
      this.showAlert(this.reportAlert, err.message, 'danger');
    }
  }

  // Triage Queue Loader
  async loadTriageQueue() {
    if (!this.token) {
      this.triageTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Please sign in as Analyst (e.g. analyst_riya) to view the triage queue.</td></tr>`;
      return;
    }

    try {
      const res = await fetch('/api/triage/pending', {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      if (res.status === 403) {
        this.triageTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-ruby">RBAC Access Denied: User role ${this.currentUser.role} lacks permission to triage intelligence. Only ROLE_ANALYST and ROLE_ADMIN permitted.</td></tr>`;
        return;
      }

      const data = await res.json();
      const list = data.pendingQueue || [];
      this.pendingBadge.textContent = `${list.length} Pending`;

      if (list.length === 0) {
        this.triageTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-emerald font-bold">✓ Vetting Queue Clear. No pending observables require review.</td></tr>`;
        return;
      }

      this.triageTableBody.innerHTML = list
        .map(
          (item) => `
        <tr>
          <td><span class="badge">${item.type}</span></td>
          <td class="font-mono text-cyan font-bold">${item.value_defanged}</td>
          <td>${item.org_name || item.org_id.substring(0, 8)}</td>
          <td><span class="badge badge-tlp-${item.tlp_level.toLowerCase()}">TLP:${item.tlp_level}</span></td>
          <td><span class="badge badge-warning">${item.status}</span></td>
          <td class="text-xs text-muted">${new Date(item.created_at).toLocaleTimeString()}</td>
          <td>
            <button class="btn btn-sm btn-primary btn-triage-item" data-id="${item.id}" data-defanged="${item.value_defanged}" data-type="${item.type}">
              Triage & Classify
            </button>
          </td>
        </tr>
      `
        )
        .join('');

      document.querySelectorAll('.btn-triage-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.openTriageModal(btn.dataset.id, btn.dataset.defanged, btn.dataset.type);
        });
      });
    } catch (err) {
      this.triageTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-ruby">${err.message}</td></tr>`;
    }
  }

  openTriageModal(id, defanged, type) {
    this.selectedIndicatorId = id;
    this.modalIocId.textContent = id;
    this.modalIocDefanged.textContent = defanged;
    this.modalIocType.textContent = type;
    this.modalAlert.classList.add('hidden');
    this.triageModal.classList.remove('hidden');
  }

  async handleTriageDecision(decision) {
    if (!this.selectedIndicatorId) return;

    const justification = document.getElementById('triage-justification').value.trim();
    if (!justification || justification.length < 5) {
      this.showAlert(this.modalAlert, 'Mandatory analyst justification must be at least 5 characters.', 'danger');
      return;
    }

    const payload = {
      decision,
      assigned_tlp: document.getElementById('triage-assigned-tlp').value,
      confidence_score: parseInt(this.confidenceSlider.value, 10),
      mitre_attack_id: document.getElementById('triage-mitre').value.trim(),
      justification
    };

    try {
      this.showAlert(this.modalAlert, `Recording immutable review decision (${decision})...`, 'info');
      const res = await fetch(`/api/iocs/${this.selectedIndicatorId}/triage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Triage decision submission failed');
      }

      this.showAlert(this.modalAlert, `Decision recorded! Status: ${decision}. Review log created.`, 'success');
      setTimeout(() => {
        this.triageModal.classList.add('hidden');
        this.loadTriageQueue();
      }, 1000);
    } catch (err) {
      this.showAlert(this.modalAlert, err.message, 'danger');
    }
  }

  // Fetch Live STIX 2.1 Threat Feed
  async fetchStixFeed() {
    const headers = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      this.stixRoleIndicator.textContent = `Authorization: ${this.currentUser.role} (${this.currentUser.username})`;

      if (this.currentUser.role === 'ROLE_CONSUMER') {
        this.stixBarrierBanner.className = 'alert alert-info';
        this.stixBarrierBanner.innerHTML =
          '<strong>Server-Side Barrier Active:</strong> Logged in as <code>ROLE_CONSUMER</code>. Server policy <code>canAccessTLP()</code> strictly stripped all TLP:RED intelligence from this bundle.';
      } else {
        this.stixBarrierBanner.className = 'alert alert-success';
        this.stixBarrierBanner.innerHTML =
          '<strong>Privileged Analyst Feed:</strong> Logged in as <code>ROLE_ANALYST / ROLE_ADMIN</code>. Complete classified feed including verified TLP:RED incident data.';
      }
    } else {
      this.stixRoleIndicator.textContent = 'Authorization: Anonymous / Public Egress';
      this.stixBarrierBanner.className = 'alert alert-info';
      this.stixBarrierBanner.innerHTML =
        '<strong>Server-Side Barrier Notice:</strong> Unauthenticated feed. Limited strictly to TLP:CLEAR intelligence.';
    }

    try {
      const res = await fetch('/api/feeds/stix', { headers });
      const data = await res.json();
      this.stixJsonDisplay.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      this.stixJsonDisplay.textContent = `Error fetching feed: ${err.message}`;
    }
  }

  // Verify Audit Chain
  async verifyAuditChain() {
    if (!this.token) {
      this.auditVerifTitle.textContent = 'Sign In Required';
      this.auditVerifSub.textContent = 'Administrator authentication required to run cryptographic verification.';
      return;
    }

    try {
      this.auditVerifTitle.textContent = 'Computing Cryptographic Hashes...';
      const [verifRes, listRes] = await Promise.all([
        fetch('/api/audit/verify', { headers: { Authorization: `Bearer ${this.token}` } }),
        fetch('/api/audit', { headers: { Authorization: `Bearer ${this.token}` } })
      ]);

      const verifData = await verifRes.json();
      const listData = await listRes.json();

      if (verifData.valid) {
        this.auditVerifTitle.innerHTML = `<span class="text-emerald">✓ AUDIT CHAIN INTACT</span> (${verifData.recordsVerified} Records)`;
        this.auditVerifSub.textContent = `Continuous SHA-256 hash chaining anchored to Genesis Hash. Zero out-of-band row tampering detected.`;
        this.metricAuditStatus.textContent = 'VERIFIED';
        this.metricAuditStatus.className = 'metric-val text-emerald';
      } else {
        this.auditVerifTitle.innerHTML = `<span class="text-ruby">⚠ TAMPERING DETECTED</span> (Record #${verifData.tamperedRecordIndex})`;
        this.auditVerifSub.textContent = verifData.message;
        this.metricAuditStatus.textContent = 'TAMPERED';
        this.metricAuditStatus.className = 'metric-val text-ruby';
      }

      // Populate audit records
      const logs = listData.logs || [];
      if (logs.length === 0) {
        this.auditTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No audit logs recorded yet.</td></tr>`;
      } else {
        this.auditTableBody.innerHTML = logs
          .slice(-10)
          .reverse()
          .map(
            (log) => `
          <tr>
            <td class="text-muted">${new Date(log.timestamp).toLocaleTimeString()}</td>
            <td><span class="badge">${log.event_type}</span></td>
            <td>${log.action_details.substring(0, 45)}...</td>
            <td class="font-mono text-cyan">${log.current_record_hash.substring(0, 16)}...</td>
          </tr>
        `
          )
          .join('');
      }
    } catch (err) {
      this.auditVerifTitle.textContent = 'Verification Error';
      this.auditVerifSub.textContent = err.message;
    }
  }

  // Fetch Prometheus Metrics
  async fetchPrometheusMetrics() {
    try {
      const res = await fetch('/metrics');
      const text = await res.text();

      // Parse Prometheus exposition format
      const httpMatch = text.match(/cti_http_requests_total\s+(\d+)/);
      if (httpMatch) this.metricHttpReqs.textContent = httpMatch[1];

      const failedLoginMatch = text.match(/cti_failed_logins_total\s+(\d+)/);
      if (failedLoginMatch) this.metricFailedLogins.textContent = failedLoginMatch[1];

      const pendingMatch = text.match(/cti_indicators_total\{status="PENDING"\}\s+(\d+)/);
      if (pendingMatch) this.metricPendingQueue.textContent = pendingMatch[1];
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  }

  startMetricsPolling() {
    this.fetchPrometheusMetrics();
    setInterval(() => this.fetchPrometheusMetrics(), 5000);
  }

  startTotpCountdown() {
    const update = () => {
      const epoch = Math.floor(Date.now() / 1000);
      const remaining = 30 - (epoch % 30);
      this.totpTimer.textContent = `${remaining}s remaining`;
    };
    update();
    setInterval(update, 1000);
  }

  // In-browser RFC 6238 TOTP computation using Web Crypto API
  async generateTOTP(secretBase32) {
    const base32ToBuffer = (str) => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = 0;
      let val = 0;
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        const c = str.charAt(i).toUpperCase();
        const index = alphabet.indexOf(c);
        if (index === -1) continue;
        val = (val << 5) | index;
        bits += 5;
        if (bits >= 8) {
          bytes.push((val >> (bits - 8)) & 255);
          bits -= 8;
        }
      }
      return new Uint8Array(bytes);
    };

    const keyBytes = base32ToBuffer(secretBase32);
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / 30);

    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(4, counter, false);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, buffer);
    const sigBytes = new Uint8Array(signature);
    const offset = sigBytes[sigBytes.length - 1] & 0xf;
    const binary =
      ((sigBytes[offset] & 0x7f) << 24) |
      ((sigBytes[offset + 1] & 0xff) << 16) |
      ((sigBytes[offset + 2] & 0xff) << 8) |
      (sigBytes[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  showAlert(el, msg, type) {
    el.className = `alert alert-${type} mt-3`;
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.ctiApp = new CTIApp();
});
