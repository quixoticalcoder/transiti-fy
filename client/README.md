# transiti-fy — Web Client

React 19 frontend for fleet, driver, trip, maintenance, cost, and analytics workflows. Uses Vite 8, Tailwind CSS 4, Redux Toolkit, Axios, Recharts, and GSAP.

See the [root README](../README.md) for backend setup, demo accounts, business rules, API routes, and known limitations.

## Local setup

Use Node.js 22.13+ as the documented toolchain baseline. From this directory:

```bash
npm ci
cp .env.example .env
npm run dev
```

Set `VITE_BASE_URL=http://localhost:5000` without `/api`. Start PostgreSQL and the Flask API separately. Optional unsigned uploads require `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`; never place server secrets in these browser settings.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Vite server, normally port 5173. |
| `npm run build` | Production bundle in `dist/`. |
| `npm run lint` | ESLint checks. |
| `npm run preview` | Local preview of the production bundle. |

## Code organization

- `pages/`: module-specific screens and forms.
- `layout/MainLayout.jsx`: navigation and application shell.
- `configs/api.js`: Axios instance, bearer-token attachment, logout on HTTP 401.
- `configs/cloudinary.js`: direct unsigned browser uploads.
- `store/slices/`: authentication, theme, and permission state.
- `hooks/usePermission.js`: UI access-level lookup.
- `components/tour/`: guided product tour.
- `lib/exportData.js`: CSV, Excel, and PDF export helpers.

Authentication, theme, and tour persistence use `transiti_fy_*` local-storage keys. Renaming these keys resets existing browser preferences and requires signing in again. The client stores a refresh token but its Axios response handler logs out on 401 rather than automatically refreshing.

Permission-aware navigation and buttons improve the interface; they do not secure the API. Most backend operational routes currently enforce only JWT presence. Server-side permission enforcement remains a documented limitation.

Exports operate on the rows passed to each button. Browser CSV escaping needs additional work for quoted/newline-containing fields. Cloudinary/Brevo delivery and PostgreSQL behavior need separate integration verification.
