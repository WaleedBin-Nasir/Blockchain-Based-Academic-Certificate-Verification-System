# ⛓️ CertChain — Blockchain-Based Academic Certificate Verification System

> **Software Design & Architecture (SDA) — Assignment 4**
> FAST-NUCES, Chiniot-Faisalabad Campus | Spring 2026

[![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](.)
[![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](.)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](.)
[![Blockchain](https://img.shields.io/badge/Blockchain-121D33?style=for-the-badge&logo=bitcoin&logoColor=white)](.)

---

## 📌 Overview

CertChain is a **Minimum Viable Product (MVP)** for a tamper-proof academic certificate verification system. Institutions issue certificates, their SHA-256 hashes are stored on a simulated blockchain ledger, and anyone (employers, universities) can verify authenticity instantly — no login required.

Built with **pure Vanilla HTML, CSS, and JavaScript** — no frameworks, no libraries. Just clean object-oriented design and GoF design patterns as taught in the SDA course.

---

## 🎥 Demo

> *(Add your demo video / GIF here)*

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 SHA-256 Hashing | Real cryptographic hashing via Web Crypto API |
| ⛓️ Blockchain Storage | Simulated immutable ledger with TX hash & block numbers |
| 📱 QR Code Generation | SVG-based QR codes for each certificate |
| ✅ Certificate Verification | Hash recalculation + blockchain comparison |
| ⊘ Revocation Support | Permanent revocation recorded on the blockchain |
| 📊 Audit Logs | Every verification attempt logged with timestamp, verifier & IP |
| 🏛️ Multi-role Access | Institution / Student / Admin role-based login |

---

## 🏗️ Architecture

The system follows the **Boundary → Controller → Entity** pattern from Lecture 14:

```
┌─────────────────────────────────────────────────┐
│              PRESENTATION (Boundary)             │
│     Landing | Login | Dashboard | Verify Portal  │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│                CONTROLLER                        │
│  handleLogin() | handleIssueCert()               │
│  handleVerify() | handleRevoke()                 │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│             SERVICE / ENTITY                     │
│   AuthService | BlockchainService | HashAdapter  │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│               DATA STORE                         │
│   certificates[] | auditLogs[] | ledger[]        │
└─────────────────────────────────────────────────┘
```

---

## 🎨 GoF Design Patterns Applied

### 1. 🔵 Singleton Pattern *(Creational)*
**Classes:** `AuthService`, `BlockchainService`

Ensures only one instance of each service exists throughout the application. Multiple instances would cause ledger inconsistency and authentication conflicts.

```javascript
class BlockchainService {
  constructor() {
    if (BlockchainService.instance) return BlockchainService.instance;
    this.ledger = [];
    BlockchainService.instance = this;
  }
  static getInstance() { ... }
}
```

---

### 2. 🟢 Observer Pattern *(Behavioral)*
**Class:** `EventBus`

When a certificate is stored on the blockchain, multiple components (UI, audit logger, console) are notified without tight coupling.

```javascript
// Events fired:
eventBus.emit('blockchain:stored', tx);
eventBus.emit('blockchain:revoked', { certId, reason });
eventBus.emit('auth:login', user);
```

---

### 3. 🟠 Adapter Pattern *(Structural)*
**Class:** `HashAdapter`

The Web Crypto API has a complex `ArrayBuffer`/`Uint8Array` interface. The adapter wraps it into a simple `string → string` hash function our system expects.

```javascript
class HashAdapter {
  static async generateSHA256(data) {
    // Adapts Web Crypto API → simple string-in / string-out
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
```

---

## 📂 Project Structure

```
Blockchain-Based-Academic-Certificate-Verification-System/
│
├── index.html       # 5 screens + 2 modals (290 lines)
├── style.css        # Design system, CSS variables, dark theme (450 lines)
├── app.js           # 3 design patterns, 9 core features (350 lines)
└── README.md
```

---

## 🖥️ Screens

| Screen | Description |
|---|---|
| 🏠 Landing Page | Hero section + 6 feature cards |
| 🔑 Login | Email, Password, Role selection |
| 📝 Signup | Registration with institution & account type |
| 📊 Dashboard | Overview, Issue Certificate, Manage, Audit Logs (4 tabs) |
| 🔍 Verification Portal | Public portal — enter Certificate ID → instant result |

---

## 🚀 How to Run

No build step, no dependencies. Just open the file:

```bash
git clone https://github.com/YOUR_USERNAME/certchain.git
cd certchain
# Open index.html in any browser
```

Or just double-click `index.html` — it runs entirely in the browser.

**Demo credentials (any email/password works — authentication is simulated):**
```
Email:    admin@fast.edu.pk
Password: anything
Role:     Institution
```

**Sample Certificate IDs to verify:**
```
CERT-2026-0001   → Valid ✅
CERT-2026-0005   → Revoked 🚫
```

---

## 📋 SRS Traceability

| Requirement | Feature | Status |
|---|---|---|
| UC-01, UC-04 | User Authentication with role-based access | ✅ |
| FR 9-14 | Certificate Issuance form + validation | ✅ |
| FR 15-16 | SHA-256 Hash Generation via Web Crypto API | ✅ |
| FR 15-19 | Blockchain storage with TX confirmation | ✅ |
| FR 20-23 | SVG-based QR Code generation | ✅ |
| FR 24-29 | Hash recalculation + blockchain comparison | ✅ |
| FR 28 | Valid / Tampered / Revoked / Not Found states | ✅ |
| FR 35-39 | Certificate Revocation with blockchain record | ✅ |
| FR 44-48 | Audit logging with timestamp, verifier, IP | ✅ |

---

## 👨‍💻 Authors

| Name | Student ID |
|---|---|
| Muhammad Ahmad | 24F-0513 |
| Waleed Bin Nasir | 24F-0516 |

**Group 06 — Software Design & Architecture**
Department of Computer Science
FAST-NUCES, Chiniot-Faisalabad Campus

---

## 📄 License

This project was built for academic purposes as part of the SDA course at FAST-NUCES.
