# Streetwise Connection℠

**Technology • Connectivity • Cybersecurity**

> **Connect. Support. Secure.**

Streetwise Connection is a technology services company for individuals, households, small businesses, and organisations.

## Core divisions

### 01 — Connect
Internet, Wi-Fi, routers, mesh systems, access points, network setup, optimisation, troubleshooting, and documentation.

### 02 — Support
PC/Mac setup, phones and tablets, software, troubleshooting, data migration, backups, remote technical support, and technology guidance.

### 03 — Secure
Account-security reviews, MFA, password-manager setup, device hardening, router security, privacy configuration, security awareness, and authorised defensive security assessments.

### 04 — Business
Small-business IT setup, business networking, Microsoft 365, Google Workspace, device deployment, backup planning, documentation, and ongoing support.

Remote support is a delivery method across all four divisions, not a separate division.

## Customers

- Individuals and households
- Remote workers
- Small businesses
- Start-ups
- Independent professionals
- Home-based businesses
- Small organisations and non-profits

## Revenue model

1. One-time services for defined support and configuration work.
2. Projects for installations, migrations, deployments, and redesigns.
3. Recurring services for technology support, network care, and small-business IT.

## Geographic strategy

- Phase 1: Las Vegas / Southern Nevada
- Phase 2: United States
- Phase 3: remote international services

## Existing cellular work

The repository contains earlier cellular/MVNO and eSIM engineering work. It is retained as a future connectivity-product foundation and remains behind provider, legal, regulatory, technical, security, and economics gates.

It is not represented as a live cellular service and should not dominate the public technology-services website.

## Business source of truth

- `docs/business-model.md` — locked company model
- `docs/services.md` — service catalogue
- `docs/pricing.md` — pricing framework
- `docs/website-architecture.md` — website/platform architecture

## Planned platform

```
Customer
   ↓
Website
   ↓
Service Request
   ↓
Streetwise Application
   ↓
Database
   ↓
Quote / Payment
   ↓
Service Delivery
   ↓
Service History
   ↓
Recurring Support
```

The intended platform can use Supabase for database/authentication/storage and Vercel for hosting.

## Development direction

1. Finalise services.
2. Finalise pricing.
3. Rebuild the public website around Connect / Support / Secure / Business.
4. Add a service-request workflow.
5. Connect requests to the application database.
6. Add quotes and payments.
7. Add customer accounts and service history.
8. Add recurring support plans.
9. Expand remote and international delivery.

**One company. One repository. One platform.**

## Brand

**Streetwise Connection℠**  
**Technology • Connectivity • Cybersecurity**  
**Stay Connected. Stay Streetwise.℠**
