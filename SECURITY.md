# Security Policy

## Supported Versions

This project currently maintains the latest `main` branch.

## Reporting a Vulnerability

Please do not open public GitHub issues for security vulnerabilities.

Send a private report to the repository owner with:
- a clear description of the issue
- reproduction steps or a proof of concept
- potential impact

We will acknowledge receipt as soon as possible and coordinate a fix and disclosure timeline.

## Security Notes

- Never commit real secrets (`CLIPROXY_MANAGEMENT_KEY`, `DASHBOARD_API_KEY`) into code or `.env` files.
- Store all secrets in Vercel Environment Variables.
- Rotate keys immediately if exposure is suspected.
