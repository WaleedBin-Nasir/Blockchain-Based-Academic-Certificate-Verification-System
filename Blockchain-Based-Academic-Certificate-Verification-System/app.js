/* ============================================
   BLOCKCHAIN CERTIFICATE VERIFICATION SYSTEM
   MVP - Application Logic
   Design Patterns Used:
   1. Singleton  - BlockchainService, AuthService
   2. Observer   - EventBus for notifications
   3. Adapter    - HashAdapter for SHA-256
   ============================================ */

// ============================================
// DESIGN PATTERN 1: OBSERVER (EventBus)
// Allows loose coupling between components
// ============================================
class EventBus {
  constructor() {
    this.listeners = {};
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
}

const eventBus = new EventBus();

// ============================================
// DESIGN PATTERN 2: SINGLETON - AuthService
// Only one auth instance throughout the app
// ============================================
class AuthService {
  constructor() {
    if (AuthService.instance) return AuthService.instance;
    this.currentUser = null;
    this.isAuthenticated = false;
    AuthService.instance = this;
  }

  static getInstance() {
    if (!AuthService.instance) new AuthService();
    return AuthService.instance;
  }

  login(email, password, role) {
    // Simulated authentication
    this.currentUser = { email, role, institution: 'FAST-NUCES', name: 'Institution Admin' };
    this.isAuthenticated = true;
    eventBus.emit('auth:login', this.currentUser);
    return { success: true, user: this.currentUser };
  }

  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    eventBus.emit('auth:logout', null);
  }

  getUser() { return this.currentUser; }
}

// ============================================
// DESIGN PATTERN 3: ADAPTER - HashAdapter
// Adapts the Web Crypto API to our system's
// expected interface for SHA-256 hashing
// ============================================
class HashAdapter {
  static async generateSHA256(data) {
    // Adapt the Web Crypto API interface to our simple string-in/string-out interface
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// ============================================
// DESIGN PATTERN 2: SINGLETON - BlockchainService
// Single instance managing all blockchain ops
// ============================================
class BlockchainService {
  constructor() {
    if (BlockchainService.instance) return BlockchainService.instance;
    this.ledger = []; // Simulated blockchain ledger
    this.blockNumber = 1000;
    BlockchainService.instance = this;
  }

  static getInstance() {
    if (!BlockchainService.instance) new BlockchainService();
    return BlockchainService.instance;
  }

  async storeCertHash(certId, certData) {
    const hash = await HashAdapter.generateSHA256(certData);
    const tx = {
      txHash: '0x' + hash.substring(0, 40),
      blockNumber: ++this.blockNumber,
      timestamp: new Date().toISOString(),
      certId,
      certHash: hash,
      status: 'confirmed'
    };
    this.ledger.push(tx);
    eventBus.emit('blockchain:stored', tx);
    return tx;
  }

  getStoredHash(certId) {
    return this.ledger.find(tx => tx.certId === certId && tx.status !== 'revoked');
  }

  async verifyCert(certId, certData) {
    const storedTx = this.getStoredHash(certId);
    if (!storedTx) return { status: 'not_found', message: 'Certificate not found on blockchain' };

    const recalcHash = await HashAdapter.generateSHA256(certData);
    
    if (storedTx.status === 'revoked') {
      return { status: 'revoked', message: 'Certificate has been REVOKED', tx: storedTx };
    }
    if (recalcHash === storedTx.certHash) {
      return { status: 'valid', message: 'Certificate is VALID and authentic', tx: storedTx };
    }
    return { status: 'tampered', message: 'Certificate has been TAMPERED with', tx: storedTx };
  }

  revokeCert(certId, reason) {
    const tx = this.ledger.find(t => t.certId === certId);
    if (tx) {
      tx.status = 'revoked';
      tx.revokeReason = reason;
      tx.revokeDate = new Date().toISOString();
      eventBus.emit('blockchain:revoked', { certId, reason });
    }
    return tx;
  }
}

// ============================================
// CERTIFICATE STORE (In-memory database)
// ============================================
const certificates = [];
const auditLogs = [];

function generateCertId() {
  const num = String(certificates.length + 1).padStart(4, '0');
  return `CERT-2026-${num}`;
}

// ============================================
// QR CODE GENERATOR (Simple SVG-based)
// ============================================
function generateQRCode(text) {
  // Simple visual QR representation using SVG grid
  const size = 21;
  let svg = `<svg viewBox="0 0 ${size} ${size}" width="168" height="168" xmlns="http://www.w3.org/2000/svg">`;
  // Generate deterministic pattern from text
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash) + text.charCodeAt(i);
  
  // Draw position detection patterns (corners)
  const drawFinder = (ox, oy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const border = x === 0 || x === 6 || y === 0 || y === 6;
      const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      if (border || inner) svg += `<rect x="${ox+x}" y="${oy+y}" width="1" height="1" fill="#1e293b"/>`;
    }
  };
  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  // Fill data modules
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if ((x < 8 && y < 8) || (x > size-9 && y < 8) || (x < 8 && y > size-9)) continue;
    const val = Math.abs(Math.sin(hash * (x + 1) * (y + 1) * 0.1)) > 0.45;
    if (val) svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="#1e293b"/>`;
  }
  svg += '</svg>';
  return svg;
}

// ============================================
// SCREEN NAVIGATION
// ============================================
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById('screen-' + screenId);
  if (screen) screen.classList.add('active');
  
  if (screenId === 'dashboard') {
    renderCertTable();
    renderCertGrid();
    renderAuditLogs();
  }
}

function switchDashTab(btn, tabId) {
  document.querySelectorAll('.nav-link[data-tab]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['overview', 'issue', 'manage', 'audit'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = t === tabId ? 'block' : 'none';
  });
  if (tabId === 'manage') renderCertGrid();
  if (tabId === 'audit') renderAuditLogs();
  if (tabId === 'overview') renderCertTable();
}

// ============================================
// AUTH HANDLERS
// ============================================
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const role = document.getElementById('loginRole').value;
  
  const auth = AuthService.getInstance();
  const result = auth.login(email, password, role);
  
  if (result.success) {
    toast('Successfully signed in!', 'success');
    showScreen('dashboard');
  }
}

function handleSignup(e) {
  e.preventDefault();
  toast('Account created successfully! Redirecting to login...', 'success');
  setTimeout(() => showScreen('login'), 1500);
}

function handleLogout() {
  AuthService.getInstance().logout();
  toast('You have been logged out', 'info');
  showScreen('landing');
}

// ============================================
// CERTIFICATE ISSUANCE
// ============================================
async function handleIssueCert(e) {
  e.preventDefault();
  
  const name = document.getElementById('issueStudentName').value;
  const studentId = document.getElementById('issueStudentId').value;
  const program = document.getElementById('issueProgram').value;
  const gradDate = document.getElementById('issueGradDate').value;
  const cgpa = document.getElementById('issueCGPA').value;
  const expiry = document.getElementById('issueExpiry').value;

  const certId = generateCertId();
  const certData = { certId, name, studentId, program, gradDate, cgpa, institution: 'FAST-NUCES' };

  toast('Generating SHA-256 hash & storing on blockchain...', 'info');

  const blockchain = BlockchainService.getInstance();
  const tx = await blockchain.storeCertHash(certId, certData);

  const cert = {
    ...certData,
    issueDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    txHash: tx.txHash,
    certHash: tx.certHash,
    blockNumber: tx.blockNumber,
    expiry
  };
  certificates.push(cert);

  // Update stats
  document.getElementById('statTotal').textContent = certificates.length;
  document.getElementById('statActive').textContent = certificates.filter(c => c.status === 'Active').length;

  toast(`Certificate ${certId} issued and stored on blockchain (Block #${tx.blockNumber})!`, 'success');
  document.getElementById('issueForm').reset();
  switchDashTab(document.querySelector('[data-tab=overview]'), 'overview');
}

// ============================================
// CERTIFICATE VERIFICATION
// ============================================
async function handleVerify() {
  const certId = document.getElementById('verifyInput').value.trim();
  if (!certId) { toast('Please enter a Certificate ID', 'error'); return; }

  const cert = certificates.find(c => c.certId === certId);
  const resultDiv = document.getElementById('verifyResult');

  if (!cert) {
    resultDiv.innerHTML = `
      <div class="result-card tampered">
        <div class="result-header tampered">
          <div class="result-icon">❌</div>
          <h3>Certificate Not Found</h3>
          <p>No certificate with ID "${certId}" exists on the blockchain</p>
        </div>
      </div>`;
    addAuditLog(certId, 'Anonymous', 'Not Found');
    return;
  }

  const blockchain = BlockchainService.getInstance();
  const result = await blockchain.verifyCert(certId, {
    certId: cert.certId, name: cert.name, studentId: cert.studentId,
    program: cert.program, gradDate: cert.gradDate, cgpa: cert.cgpa,
    institution: cert.institution
  });

  const icons = { valid: '✅', tampered: '⚠️', revoked: '🚫' };
  const titles = { valid: 'Certificate VALID', tampered: 'TAMPERED DETECTED', revoked: 'Certificate REVOKED' };

  resultDiv.innerHTML = `
    <div class="result-card ${result.status}">
      <div class="result-header ${result.status}">
        <div class="result-icon">${icons[result.status]}</div>
        <h3>${titles[result.status]}</h3>
        <p>${result.message}</p>
      </div>
      <div class="result-details">
        <div class="result-row"><span class="label">Certificate ID</span><span class="value">${cert.certId}</span></div>
        <div class="result-row"><span class="label">Student Name</span><span class="value">${cert.name}</span></div>
        <div class="result-row"><span class="label">Student ID</span><span class="value">${cert.studentId}</span></div>
        <div class="result-row"><span class="label">Program</span><span class="value">${cert.program}</span></div>
        <div class="result-row"><span class="label">Institution</span><span class="value">${cert.institution}</span></div>
        <div class="result-row"><span class="label">Issue Date</span><span class="value">${cert.issueDate}</span></div>
        <div class="result-row"><span class="label">Block Number</span><span class="value">#${cert.blockNumber}</span></div>
        <div class="result-row"><span class="label">Hash</span><span class="value" style="font-family:monospace;font-size:11px;color:var(--accent);">${cert.certHash.substring(0,32)}...</span></div>
      </div>
    </div>`;

  addAuditLog(certId, 'Anonymous Verifier', result.status === 'valid' ? 'Valid' : result.status === 'revoked' ? 'Revoked' : 'Tampered');
  toast(`Verification complete: ${result.status.toUpperCase()}`, result.status === 'valid' ? 'success' : 'error');
}

// ============================================
// CERTIFICATE REVOCATION
// ============================================
function openRevokeModal(certId) {
  document.getElementById('revokeCertId').value = certId;
  document.getElementById('revokeModal').classList.add('active');
}

function handleRevoke() {
  const certId = document.getElementById('revokeCertId').value;
  const reason = document.getElementById('revokeReason').value;

  const cert = certificates.find(c => c.certId === certId);
  if (cert) {
    cert.status = 'Revoked';
    BlockchainService.getInstance().revokeCert(certId, reason);
    document.getElementById('statRevoked').textContent = certificates.filter(c => c.status === 'Revoked').length;
    document.getElementById('statActive').textContent = certificates.filter(c => c.status === 'Active').length;
    toast(`Certificate ${certId} has been revoked permanently on blockchain`, 'error');
    addAuditLog(certId, 'FAST-NUCES Admin', 'Revoked');
    renderCertTable();
    renderCertGrid();
  }
  closeModal('revokeModal');
}

// ============================================
// QR CODE MODAL
// ============================================
function showQR(certId) {
  const qr = generateQRCode(certId);
  document.getElementById('qrDisplay').innerHTML = qr;
  document.getElementById('qrCertId').textContent = certId;
  document.getElementById('qrModal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function renderCertTable() {
  const tbody = document.getElementById('certTableBody');
  if (!tbody) return;
  tbody.innerHTML = certificates.slice().reverse().map(c => `
    <tr>
      <td style="font-family:monospace;color:var(--accent);">${c.certId}</td>
      <td>${c.name}</td>
      <td>${c.program}</td>
      <td>${c.issueDate}</td>
      <td><span class="badge badge-${c.status === 'Active' ? 'success' : 'danger'}">${c.status === 'Active' ? '● ' : '⊘ '}${c.status}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-secondary" onclick="showQR('${c.certId}')">📱 QR</button>
          ${c.status === 'Active' ? `<button class="btn btn-sm btn-danger" onclick="openRevokeModal('${c.certId}')">Revoke</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCertGrid() {
  const grid = document.getElementById('certGrid');
  if (!grid) return;
  grid.innerHTML = certificates.slice().reverse().map(c => `
    <div class="cert-card">
      <div class="cert-card-header">
        <div>
          <h4>${c.name}</h4>
          <div class="sub">${c.studentId} • ${c.program}</div>
        </div>
        <span class="badge badge-${c.status === 'Active' ? 'success' : 'danger'}">${c.status}</span>
      </div>
      <div class="cert-meta">
        <div class="cert-meta-item"><div class="meta-label">Certificate ID</div><div class="meta-value">${c.certId}</div></div>
        <div class="cert-meta-item"><div class="meta-label">Issue Date</div><div class="meta-value">${c.issueDate}</div></div>
        <div class="cert-meta-item"><div class="meta-label">Block #</div><div class="meta-value">${c.blockNumber}</div></div>
        <div class="cert-meta-item"><div class="meta-label">Institution</div><div class="meta-value">${c.institution}</div></div>
      </div>
      <div class="cert-hash">🔗 ${c.certHash}</div>
      <div class="cert-actions">
        <button class="btn btn-sm btn-primary" onclick="showQR('${c.certId}')">📱 QR Code</button>
        ${c.status === 'Active' ? `<button class="btn btn-sm btn-danger" onclick="openRevokeModal('${c.certId}')">⊘ Revoke</button>` : '<button class="btn btn-sm btn-secondary" disabled>Revoked</button>'}
        <button class="btn btn-sm btn-outline" onclick="copyHash('${c.certHash}')">📋 Copy Hash</button>
      </div>
    </div>
  `).join('');
}

function renderAuditLogs() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;
  tbody.innerHTML = auditLogs.slice().reverse().map(log => `
    <tr>
      <td>${log.timestamp}</td>
      <td style="font-family:monospace;color:var(--accent);">${log.certId}</td>
      <td>${log.verifier}</td>
      <td style="font-family:monospace;">${log.ip}</td>
      <td><span class="badge badge-${log.result === 'Valid' ? 'success' : log.result === 'Revoked' ? 'warning' : 'danger'}">${log.result}</span></td>
    </tr>
  `).join('');
}

function addAuditLog(certId, verifier, result) {
  auditLogs.push({
    timestamp: new Date().toLocaleString(),
    certId,
    verifier,
    ip: `192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
    result
  });
}

function copyHash(hash) {
  navigator.clipboard.writeText(hash).then(() => toast('Hash copied to clipboard!', 'success'));
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function toast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 4000);
}

// ============================================
// OBSERVER: Listen for events
// ============================================
eventBus.on('blockchain:stored', (tx) => {
  console.log(`[Blockchain] Certificate stored: Block #${tx.blockNumber}, Hash: ${tx.certHash.substring(0,16)}...`);
});

eventBus.on('blockchain:revoked', ({ certId, reason }) => {
  console.log(`[Blockchain] Certificate ${certId} revoked: ${reason}`);
});

eventBus.on('auth:login', (user) => {
  console.log(`[Auth] User logged in: ${user.email} (${user.role})`);
});

eventBus.on('auth:logout', () => {
  console.log('[Auth] User logged out');
});

// ============================================
// SEED SAMPLE DATA
// ============================================
async function seedData() {
  const blockchain = BlockchainService.getInstance();
  const samples = [
    { name: 'Muhammad Ahmad', studentId: '24F-0513', program: 'BS Computer Science', gradDate: '2026-06-15', cgpa: '3.72' },
    { name: 'Waleed Bin Nasir', studentId: '24F-0516', program: 'BS Computer Science', gradDate: '2026-06-15', cgpa: '3.85' },
    { name: 'Ahmed Hassan', studentId: '24F-0301', program: 'BS Software Engineering', gradDate: '2026-06-15', cgpa: '3.45' },
    { name: 'Sara Khan', studentId: '24F-0422', program: 'BS Data Science', gradDate: '2026-06-15', cgpa: '3.91' },
    { name: 'Ali Raza', studentId: '24F-0178', program: 'BS Artificial Intelligence', gradDate: '2025-12-20', cgpa: '3.58' },
  ];

  for (const s of samples) {
    const certId = generateCertId();
    const certData = { certId, ...s, institution: 'FAST-NUCES' };
    const tx = await blockchain.storeCertHash(certId, certData);
    certificates.push({
      ...certData,
      issueDate: '2026-05-10',
      status: 'Active',
      txHash: tx.txHash,
      certHash: tx.certHash,
      blockNumber: tx.blockNumber,
      expiry: 'none'
    });
  }

  // Revoke one for demo
  certificates[4].status = 'Revoked';
  blockchain.revokeCert(certificates[4].certId, 'Issued by mistake');

  // Add sample audit logs
  const sampleLogs = [
    { certId: 'CERT-2026-0001', verifier: 'HR - Google Pakistan', result: 'Valid' },
    { certId: 'CERT-2026-0002', verifier: 'Systems Ltd Recruitment', result: 'Valid' },
    { certId: 'CERT-2026-0003', verifier: 'Anonymous', result: 'Valid' },
    { certId: 'CERT-2026-0005', verifier: 'TechCorp HR', result: 'Revoked' },
    { certId: 'CERT-2026-0001', verifier: 'NUST Admissions', result: 'Valid' },
  ];
  sampleLogs.forEach(l => addAuditLog(l.certId, l.verifier, l.result));

  document.getElementById('statTotal').textContent = certificates.length;
  document.getElementById('statActive').textContent = certificates.filter(c => c.status === 'Active').length;
  document.getElementById('statRevoked').textContent = certificates.filter(c => c.status === 'Revoked').length;
}

// Initialize
seedData();
