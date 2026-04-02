#!/bin/bash

# Script to setup EduCRM project dependencies
echo "🚀 Setting up EduCRM Project Dependencies..."

# Frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Microservices dependencies (optional - uncomment if needed)
# echo "🔧 Installing microservices dependencies..."
# cd microservices
# for service in */; do
#   if [ -f "$service/package.json" ]; then
#     echo "Installing dependencies for $service"
#     cd $service && npm install && cd ..
#   fi
# done
# cd ..

echo "✅ Dependencies setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Start frontend: npm run dev"
echo "  2. Start microservices: cd microservices && docker-compose up -d"
echo "  3. Initialize databases: ./init-databases.sh"