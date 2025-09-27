# Project Strategic Overview

## 1. Core Vision & Strategy
This project is an e-commerce platform built on a "Spiritual Economy" concept. We start with a standard MVP (e-commerce functionalities) but the architecture must be forward-thinking to support future complex features like a virtual currency system ("Noor"). The core principle is "Evolutionary Architecture".

## 2. Technology Stack
- **Frontend:** Next.js (App Router, SSR, ISR)
- **Backend/CMS:** Strapi
- **Database:** PostgreSQL
- **Styling:** SCSS Modules
- **State Management:** Zustand
- **Authentication:** NextAuth.js (OTP, Google OAuth)
- **Deployment:** Vercel (Frontend), Docker on VPS (Backend)

## 3. Project Phases (Roadmap)
1.  **Phase 1: Local-First MVP:** Build all standard e-commerce features in a local environment.
2.  **Phase 2: "Nezam-e-Noor" Implementation:** Integrate the virtual currency, wallet, and related features.
3.  **Phase 3: Deployment & Final Integration:** Move to production servers and connect to live services (payment gateways, etc.).
**Current Status: We are in Phase 1.**

## 4. Backend (Strapi) Content-Types Overview
- **Product:** title, slug, description, price, images, stock, category, tags.
- **Article:** title, slug, excerpt, content, cover, tags, author.
- **Course:** title, slug, description, price, curriculum, media.
- **Service:** title, slug, description, image, link.
- **User:** name, phone, email, with relations to orders, wishlist, etc.
- **Order:** user, items, shipping details, status.
- **Supporting Types:** Notification, Comment, Message.

This overview provides the high-level context. For specific feature implementation, refer to the task-specific `CONTEXT_{FeatureName}.md` file provided in the prompt.