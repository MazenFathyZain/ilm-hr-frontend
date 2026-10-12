# HR dashboard (React + Vite)

```bash
npm install
npm run dev     # http://localhost:5173 – proxies /api to http://localhost:4000
npm run build   # static files in dist/
```

For a production build served from a different origin than the API, set `VITE_API_URL` (see `.env.example`) and add the dashboard's origin to the API's `CORS_ORIGINS`.

Managers see every section. Team leaders see Overview, Attendance, Requests, Employees, Teams and Locations, all limited to their own team(s).
