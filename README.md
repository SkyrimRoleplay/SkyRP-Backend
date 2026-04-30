# Frostfall-Backend

The backend starts the public API on `PORT` and the management dashboard on
`DASHBOARD_PORT`. The dashboard uses the existing Discord OAuth flow at
`/auth/dashboard/*`; give the management Discord role
`dashboard.access`, `factions.manage`, and `permissions.manage` in
`data/role-permissions.json`.

The faction and hold whitelist slots live in `data/faction-whitelist.json`.
Slots with `"capacity": 1` are exclusive positions, while `"capacity": null`
means the rank can be extended to more players.

Server access is managed through `data/server-access.json` and the dashboard
Access tab. Banned users are blocked by one Discord role, normal whitelist
access is controlled by one Discord role, and locked mode can allow multiple
Discord roles plus the legacy user-id emergency list.
