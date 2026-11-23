# Portfolio API

FastAPI backend for the existing React/Vite portfolio. The frontend remains at the repository root; this independent service lives in `backend/` and exposes a versioned REST API.

## Local setup

1. Create a PostgreSQL database and copy `.env.example` to `.env` in this directory.
2. Create a virtual environment and install the dependencies:

   ```powershell
   py -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. Apply the database migrations:

   ```powershell
   alembic upgrade head
   ```

4. Create the first administrator through the private CLI prompt (there is no public registration route):

   ```powershell
   python -m app.scripts.create_admin
   ```

5. Start the API from this directory:

   ```powershell
   python -m app
   ```

Development API documentation is available at `http://localhost:8000/docs`; `/health` is a database-independent process check.

## API outline

| Purpose | Endpoint |
| --- | --- |
| Login / current administrator / logout | `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout` |
| Public profile, projects, skills, education, experience, certifications, training, social links | `GET /api/v1/public/{resource}` |
| Public contact form | `POST /api/v1/public/messages` |
| Authenticated administration CRUD | `/api/v1/admin/{resource}` |
| Message inbox | `GET /api/v1/admin/messages`, `PATCH /api/v1/admin/messages/{id}`, `DELETE /api/v1/admin/messages/{id}` |

Public content routes return published or visible records only. Project/experience records use a `draft` or `published` status. Other collections have an `is_public` flag. Translations are stored in separate relational translation tables, with a unique French or English row per parent record; requests to public routes select a locale using `?locale=fr` or `?locale=en`.

Admin login returns a CSRF token in its JSON response and sets an HttpOnly session cookie. Include the cookie (`credentials: include`) and `X-CSRF-Token` header on every state-changing admin request. Logout revokes the server-side session. Login attempts are limited by hashed client address. Configure the exact frontend origins in `FRONTEND_ORIGINS`; production cookies require HTTPS.

## Environment variables

- `DATABASE_URL`: PostgreSQL URL; standard `postgresql://` URLs are normalized to psycopg 3.
- `SECRET_KEY`: random secret, at least 32 characters in production.
- `FRONTEND_ORIGINS`: comma-separated exact origins, for example `https://portfolio.example.com`.
- `APP_ENV`: `development` enables Swagger; production disables API docs and enables secure cross-site cookies.
- `SESSION_TTL_HOURS`: administrator session lifetime.

Image/document fields currently accept external HTTPS URLs. For Vercel, Render, Neon setup and production environment variables, see [the deployment guide](../DEPLOYMENT.md).
