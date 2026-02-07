# Scripts Guide

Once `npm install` completes, you can run these scripts to verify functionality:

## 1. Security & Core API Test
Verifies multi-tenancy, rate limiting, and basic health.
```powershell
npx ts-node --transpileOnly scripts/security-test.ts
```

## 2. Advanced Features Test (PDF & Email)
Generates a dummy PDF report and attempts to send it via Ethereal Email.
- Checks `PdfService` (Puppeteer)
- Checks `EmailService` (Nodemailer)
- Reference: `scripts/test-pdf-email.ts`
```powershell
npx ts-node --transpileOnly scripts/test-pdf-email.ts
```
*Look for "Preview URL" in the output.*

## 3. Background Queue Test
Verifies the Queue Facade (Mock Queue) logic.
- Adds job to 'reports' queue
- Simulates execution if Redis is missing
```powershell
npx ts-node --transpileOnly scripts/test-queue.ts
```

## 4. Phase 4 Route Check
Verifies integration routes are mounted.
```powershell
npx ts-node --transpileOnly scripts/validate-phase4.ts
```
