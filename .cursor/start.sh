#!/usr/bin/env bash
# Per-boot runtime initialization: bring up Postgres+pgvector, apply
# migrations, seed the deterministic demo course once, and wire the frontend
# to the live backend. Idempotent and safe to re-run.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/bin:$PATH"

PG_VER=16
PG_CLUSTER=main
DB_NAME=studygotchi
DB_USER=studygotchi
DB_PASS=studygotchi

# 1. Start PostgreSQL if it is not already accepting connections.
if ! pg_isready -q -h localhost -p 5432 2>/dev/null; then
  sudo pg_ctlcluster "$PG_VER" "$PG_CLUSTER" start || true
  for _ in $(seq 1 30); do
    pg_isready -q -h localhost -p 5432 && break
    sleep 1
  done
fi
pg_isready -q -h localhost -p 5432

# 2. Ensure role, database, and the pgvector extension exist.
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END \$\$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
sudo -u postgres psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null
sudo -u postgres psql -d "${DB_NAME}" -c "ALTER SCHEMA public OWNER TO ${DB_USER};" >/dev/null

# 3. Apply database migrations.
cd "$REPO_ROOT/backend"
uv run alembic upgrade head

# 4. Seed the deterministic demo course once (no LLM required).
export PGPASSWORD="${DB_PASS}"
COURSE_COUNT=$(psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -tAc \
  "SELECT count(*) FROM courses WHERE code='CS-4780';")
if [ "${COURSE_COUNT}" = "0" ]; then
  uv run python -m scripts.seed_demo_course
fi

# 5. Point the frontend at the seeded course/student for a live demo.
COURSE_ID=$(psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -tAc \
  "SELECT id FROM courses WHERE code='CS-4780' ORDER BY created_at LIMIT 1;")
STUDENT_ID=$(psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -tAc \
  "SELECT student_id FROM student_concept_states WHERE course_id='${COURSE_ID}' LIMIT 1;")

if [ -n "${COURSE_ID}" ] && [ -n "${STUDENT_ID}" ]; then
  cat > "$REPO_ROOT/frontend/.env.local" <<EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_COURSE_ID=${COURSE_ID}
NEXT_PUBLIC_COURSE_NAME=Intermediate Machine Learning
NEXT_PUBLIC_STUDENT_ID=${STUDENT_ID}
EOF
fi

echo "start.sh: Postgres ready, migrations applied, demo course=${COURSE_ID} student=${STUDENT_ID}"
