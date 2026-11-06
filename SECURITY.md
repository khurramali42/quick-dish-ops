# Security policy

## Supported scope

This repository is a **single-browser demonstration** of a restaurant POS. It stores customer, sales, product, and supplier records in local browser storage.

**Do not use it for genuine customer personal data, real payment processing, multi-user business operations, or production financial accounting.** No authentication system, server-side ledger, centralized database, access controls, encrypted backups, or real payment gateway is implemented. Displayed payment methods only record the operator's selection; they do not charge cards or wallets.

## Reporting a vulnerability

Do not post passwords, private records, API tokens, database dumps, screenshots containing real customer data, or exploit instructions in public GitHub issues. Use GitHub's private vulnerability reporting if enabled, or contact the repository owner privately via their GitHub profile. Public issues are suitable for non-sensitive bug reports with fictional reproduction data.

## Security hygiene

Run with a current supported Node.js and Bun version, review third-party dependencies before production use, never commit secrets or customer exports, and treat browser backups as sensitive. Clearing local browser storage can irreversibly remove business records.
