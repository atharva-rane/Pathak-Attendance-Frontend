# Pathak Attendance — Frontend

React (Vite) + AG Grid attendance UI for the Dhol Tasha pathak.

## 1. Install dependencies

```bash
cd "Pathak Attendance Frontend"
npm install
```

This installs: `react`, `react-dom`, `react-router-dom`, `axios`, `ag-grid-community`, `ag-grid-react`, `xlsx` (and `vite` + `@vitejs/plugin-react` for the dev/build tooling).

## 2. Configure the API URL

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:5000/api
```
(Change this to your deployed backend URL once you deploy it, e.g. `https://pathak-attendance-backend.vercel.app/api`.)

## 3. Run locally

```bash
npm run dev
```

Opens at `http://localhost:5173`. Make sure the backend (see the Backend README) is running first, and log in with the admin credentials you created via `npm run seed:admin` in the backend.

## 4. Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel
```

In your Vercel project settings, add the environment variable `VITE_API_URL` pointing at your deployed backend, then redeploy (`vercel --prod`). Also go back to the backend's `CLIENT_ORIGIN` env var and add this frontend's Vercel URL so CORS allows it.

## Folder structure

```
src/
  api/axios.js            — axios instance, attaches JWT token automatically
  context/AuthContext.jsx — login/logout state, persisted in localStorage
  components/
    Login.jsx              — admin login screen
    Home.jsx                — "Make Attendance" cards (Dhol / Tasha, extendable)
    Navbar.jsx               — top bar with logout
    AttendancePage.jsx       — toolbar + search + AG Grid table + summary + export
    StudentFormModal.jsx     — add/edit student form
    ConfirmDeleteModal.jsx   — delete confirmation popup
    SummarySection.jsx       — present/absent totals
    ProtectedRoute.jsx       — redirects to /login if not authenticated
  styles/                   — one CSS file per component
```

## Notes

- Attendance is tracked per calendar day. The grid always shows **today's** attendance; marking present/absent/seva calls the backend which upserts today's record for that student.
- To add a new group later (e.g. "Zhanz"), add an entry to the `GROUPS` array in `Home.jsx` and allow that value in the backend's `Student` model `vadan` enum — no other structural changes needed.
- The AG Grid columns are resizable by dragging column borders (drag-to-grow/shrink is built in via `resizable: true`), sortable by clicking headers, and filterable via the built-in column filters.
- Export produces a file named `Dhol_Tasha_YYYY-MM-DD.xlsx` containing whatever rows are currently visible (so a search filter narrows the export too).
