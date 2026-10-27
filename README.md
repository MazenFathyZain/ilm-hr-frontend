# HR dashboard (React + Vite)

```bash
npm install
npm run dev     # http://localhost:5173 – proxies /api to http://localhost:4000
npm run build   # static files in dist/
```

For a production build served from a different origin than the API, set `VITE_API_URL` (see `.env.example`) and add the dashboard's origin to the API's `CORS_ORIGINS`.

Managers see every section. Team leaders see Overview, Attendance, Requests, Employees, Teams and Locations, all limited to their own team(s).

## Weekly days off per employee

Managers can open **Employees → employee → Edit → Work schedule**. Turn off **Use company schedule** to edit the employee's schedule. Leave **Use company days off** on to follow Settings, or turn it off and select that employee's days off (for example, Friday only). Empty work-hour and grace fields continue to follow company settings. Turning **Use company schedule** back on resets every schedule override to the company defaults.
