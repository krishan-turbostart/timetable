#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "==> Starting PostgreSQL and Solver containers..."
docker compose up -d

echo "==> Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U timetable > /dev/null 2>&1; do
  sleep 1
done
echo "    PostgreSQL is ready."

echo "==> Waiting for Solver to be ready..."
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
  sleep 1
done
echo "    Solver is ready."

echo "==> Installing web dependencies (if needed)..."
cd web
npm install --silent 2>/dev/null

echo "==> Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss

echo "==> Seeding database (if empty)..."
npx prisma db seed 2>/dev/null || true

echo ""
echo "==> Starting Next.js dev server..."
echo "    Frontend: http://localhost:3000"
echo "    Solver:   http://localhost:8000"
echo ""
exec npm run dev
