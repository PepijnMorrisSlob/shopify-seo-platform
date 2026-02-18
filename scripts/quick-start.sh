#!/bin/bash

# =====================================
# Shopify SEO Platform - Quick Start
# =====================================
# This script helps new developers get started quickly
# =====================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Shopify SEO Platform - Quick Start"
echo "=================================================="
echo ""

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}✗ $1 is not installed${NC}"
        echo "  Install from: $2"
        return 1
    else
        echo -e "${GREEN}✓ $1 is installed${NC}"
        return 0
    fi
}

echo -e "${BLUE}Checking prerequisites...${NC}"
echo ""

ALL_GOOD=true

check_command "docker" "https://docs.docker.com/get-docker/" || ALL_GOOD=false
check_command "docker compose" "https://docs.docker.com/compose/install/" || ALL_GOOD=false
check_command "node" "https://nodejs.org/" || ALL_GOOD=false
check_command "git" "https://git-scm.com/" || ALL_GOOD=false

echo ""

if [ "$ALL_GOOD" = false ]; then
    echo -e "${RED}Please install missing prerequisites and run this script again.${NC}"
    exit 1
fi

echo -e "${GREEN}All prerequisites installed!${NC}"
echo ""

# Setup environment
echo -e "${BLUE}Setting up environment...${NC}"
echo ""

if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env and fill in your API keys${NC}"
    echo ""
else
    echo -e "${GREEN}.env file already exists${NC}"
    echo ""
fi

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
echo ""

echo "Installing backend dependencies..."
cd backend
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

echo "Installing frontend dependencies..."
cd ../frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

cd ..

# Start Docker services
echo -e "${BLUE}Starting Docker services...${NC}"
echo ""

echo "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis

echo "Waiting for services to be ready..."
sleep 5

echo -e "${GREEN}✓ Docker services started${NC}"
echo ""

# Setup database
echo -e "${BLUE}Setting up database...${NC}"
echo ""

cd backend

echo "Generating Prisma client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate dev --name init || npx prisma db push

echo -e "${GREEN}✓ Database setup complete${NC}"
echo ""

cd ..

# Final instructions
echo "=================================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit .env file and add your API keys:"
echo "   - SHOPIFY_API_KEY"
echo "   - SHOPIFY_API_SECRET"
echo "   - OPENAI_API_KEY (optional)"
echo "   - ANTHROPIC_API_KEY (optional)"
echo ""
echo "2. Start the development servers:"
echo ""
echo "   Terminal 1 - Backend:"
echo "   $ cd backend"
echo "   $ npm run start:dev"
echo ""
echo "   Terminal 2 - Frontend:"
echo "   $ cd frontend"
echo "   $ npm run dev"
echo ""
echo "3. Access the application:"
echo "   - Frontend:  http://localhost:5173"
echo "   - Backend:   http://localhost:3000"
echo "   - API Docs:  http://localhost:3000/api-docs"
echo "   - pgAdmin:   http://localhost:5050"
echo "   - Redis UI:  http://localhost:8081"
echo ""
echo "4. Run tests:"
echo "   $ cd backend && npm test"
echo "   $ cd frontend && npm test"
echo ""
echo "=================================================="
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo ""
echo "  View Docker logs:"
echo "  $ docker compose logs -f"
echo ""
echo "  Stop services:"
echo "  $ docker compose down"
echo ""
echo "  Restart services:"
echo "  $ docker compose restart"
echo ""
echo "  Database GUI (Prisma Studio):"
echo "  $ cd backend && npx prisma studio"
echo ""
echo "  Generate secrets:"
echo "  $ ./scripts/generate-secrets.sh"
echo ""
echo "=================================================="
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo "=================================================="
