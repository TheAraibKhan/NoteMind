#!/bin/bash

echo "╔════════════════════════════════════════╗"
echo "║    NoteMind SaaS - Setup Script        ║"
echo "╚════════════════════════════════════════╝"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"

# Install Frontend Dependencies
echo -e "\n${YELLOW}📦 Installing Frontend Dependencies...${NC}"
cd frontend
npm install --legacy-peer-deps
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi

# Install Backend Dependencies
echo -e "\n${YELLOW}📦 Installing Backend Dependencies...${NC}"
cd ../backend
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

# Setup Environment Variables
echo -e "\n${YELLOW}⚙️  Setting up environment variables...${NC}"

if [ ! -f backend/.env ]; then
    cat > backend/.env << EOF
# Backend Configuration
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/notemind
JWT_SECRET=your-secret-key-change-in-production
OPENAI_API_KEY=sk-your-key-here
CORS_ORIGIN=http://localhost:3000
EOF
    echo -e "${GREEN}✓ Created backend/.env (please update with real values)${NC}"
else
    echo -e "${YELLOW}⚠️  backend/.env already exists, skipping...${NC}"
fi

if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api
EOF
    echo -e "${GREEN}✓ Created frontend/.env.local${NC}"
else
    echo -e "${YELLOW}⚠️  frontend/.env.local already exists, skipping...${NC}"
fi

cd ..

echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✓ Setup Complete!               ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  📖 Next Steps:                        ║${NC}"
echo -e "${GREEN}║  1. Update backend/.env variables      ║${NC}"
echo -e "${GREEN}║  2. npm run dev (from root)            ║${NC}"
echo -e "${GREEN}║  3. Visit http://localhost:3000        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"
