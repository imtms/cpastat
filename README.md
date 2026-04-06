# CLiProxy API Key Dashboard (Vercel)

A lightweight open-source dashboard:
- `Vue 3 + Vite` frontend
- `Vercel Functions` server-side proxy for CLiProxy management API
- secrets kept in Vercel environment variables

## License

This project is licensed under the [MIT License](./LICENSE).

## Project Structure

- `frontend/`: Vue frontend
- `api/stats.js`: Vercel Function (server-side)
- `vercel.json`: Vercel build/function config

## How It Works

1. Browser calls `GET /api/stats`
2. Vercel Function reads env vars:
- `CLIPROXY_MANAGEMENT_KEY`
- `DASHBOARD_API_KEY` (fixed key displayed by dashboard)
 - `DASHBOARD_TIMEZONE` (optional, used for daily stats split)
3. Function requests `CLIPROXY_BASE_URL/v0/management/usage`
4. Function returns fixed-key stats:
 - `today`: request count, token count, failure count
 - `total`: cumulative request count, token count, failure count
 - per-model breakdown for both `today` and `total`

## Required Environment Variables

Set in Vercel Project Settings -> Environment Variables:

- `CLIPROXY_MANAGEMENT_KEY`: CLiProxy management key
- `CLIPROXY_BASE_URL`: CLiProxy base URL, e.g. `https://your-cliproxy.example.com`
- `DASHBOARD_API_KEY`: fixed API key to display in dashboard

## Optional Environment Variables

- `REQUEST_TIMEOUT_MS`: timeout for CLiProxy request (default `15000`)
- `DASHBOARD_TIMEZONE`: timezone for daily split (default `Asia/Shanghai`)

## Local Development

Recommended full-stack local mode:

```bash
cd /Users/tms/Projects/cpa-dashboard
npm --prefix frontend install
vercel dev
```

Frontend-only mode:

```bash
cd /Users/tms/Projects/cpa-dashboard/frontend
npm install
npm run dev
```

If API is hosted elsewhere during frontend-only mode, set in `frontend/.env`:

```env
VITE_BACKEND_BASE_URL=http://localhost:3000
```

## Deploy to Vercel

```bash
cd /Users/tms/Projects/cpa-dashboard
vercel
```

After deployment, make sure env vars are set and redeploy.

## Security

- Do not commit secrets to repository files.
- Keep `CLIPROXY_MANAGEMENT_KEY` and `DASHBOARD_API_KEY` in Vercel env vars only.
- See [SECURITY.md](./SECURITY.md) for reporting policy.

## API References

- Frontend -> Function: `GET /api/stats`
- Function -> CLiProxy: `GET /v0/management/usage` with `Authorization: Bearer <MANAGEMENT_KEY>`
- [CLiProxyAPI Management API Docs](https://help.router-for.me/cn/management/api)
