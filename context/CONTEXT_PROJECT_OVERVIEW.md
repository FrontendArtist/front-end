# 📘 CONTEXT_PROJECT_OVERVIEW_V3.md

## 🎯 Purpose

This document provides a comprehensive yet concise overview of the project’s purpose, architecture, and evolution path.
It serves as a **core contextual foundation** for all prompts and workflows within Cursor AI, ensuring that every generated code or component remains consistent, modular, and aligned with the project’s architecture.

---

## 🧭 Project Overview

The project is a **Next.js + Strapi + PostgreSQL**-based full-stack website built following **KISS / YAGNI** and **Evolutionary Design** principles.

All dynamic data (Products, Services, Articles, and Courses) are fetched from **Strapi**, and the frontend is rendered via **Next.js**.

### 🔹 Core Objectives

* Deliver a fully functional MVP powered by live Strapi data.
* Establish a flexible, modular, and scalable architecture for the production phase.
* Prepare the system architecture for future integration of the **Nizam-e-Noor** financial ecosystem.
* Maintain clarity, simplicity, and an evolutionary improvement cycle throughout development.

---

## ⚙️ Project Phases

### **Phase 1: MVP Development**

* Fetch and render all dynamic data (Products, Services, Articles, Courses) directly from Strapi.
* Connect homepage sections to real Strapi collections.
* Conduct all testing in a Local environment.
* Ensure consistent, Context-driven development with Cursor AI.

### **Phase 2: Production Deployment**

* Target platform: **Liara** (frontend and backend as separate services).
* Use Liara’s managed PostgreSQL instance.
* Integrate authentication (NextAuth.js) and payment processing (Zarinpal).
* Prepare CI/CD pipelines for automated deployment.
* Note: Final deployment configurations will be defined during this phase.

### **Phase 3: Nizam-e-Noor (Future Phase)**

* Extend Strapi Content-Types (Wallet, Transactions, Rewards).
* Integrate Wallet and internal transaction flows with user accounts.
* Implement foundational logic for a virtual economy and service-based credit system.

---

## 🧩 Technical Architecture

### 🖥️ Frontend

* **Framework:** Next.js 14 (App Router)
* **Language:** JavaScript (ESNext)
* **State Management:** Zustand
* **Styling:** SCSS Modules using CSS Custom Properties (`--var`)
* **Authentication:** NextAuth.js
* **Payments:** Zarinpal Integration
* **Architecture Compliance:** Based on `ARCHITECTURE_RULES.md`

### ⚙️ Backend

* **CMS:** Strapi 5 (Headless)
* **Database:** PostgreSQL
* **Content Management:** Custom Content-Types (Product, Course, Article, Service)
* **Data Sanitization:** All HTML content sanitized via DOMPurify before rendering.
* **API Layer:** Centralized API access through `src/lib/api.js`.

---

## 🧠 Core Design & Development Principles

1. **Server-First Rendering** → All components are Server Components by default unless they use client-side state or hooks.
2. **Separation of Concerns** → Logic, data fetching, and presentation layers must remain strictly separated.
3. **Context-Based Evolution** → Each new feature or change begins with a Context definition before implementation.
4. **Reusability** → Components, utilities, and hooks must be reusable and modular.
5. **Consistency** → Use unified naming conventions and directory structure across the codebase.
6. **Simplicity (KISS/YAGNI)** → Avoid unnecessary complexity and abstractions.
7. **Security First** → Always sanitize dynamic HTML before rendering to prevent XSS.
8. **Centralized API Access** → No direct `fetch` calls within components; all requests must go through `src/lib/api.js`.
9. **Modular Scalability** → Each feature should be designed to evolve independently without breaking existing logic.

---

## 🔗 Reference Documents

* `PROJECT_OVERVIEW.md` → High-level roadmap and phase definitions.
* `ARCHITECTURE_RULES.md` → Technical and structural guidelines.
* `AI_WORKFLOWS.md` → Standardized AI-driven development workflows.
* `styles.md` → Visual and design token specifications.
* `PROJECT_PROGRESS.md` → Single source of truth for the current project state.

---

## 📄 Note

This document must always remain synchronized with its reference sources.
Any modification or adjustment must be logged as a **Phase Sync Update** within `PROJECT_PROGRESS.md`.
