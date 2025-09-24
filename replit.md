# MyNutrify - AI-Powered Nutrition Tracking App

## Overview
MyNutrify is a comprehensive nutrition tracking application that uses AI to analyze food photos and calculate calories, macronutrients, and daily nutrition goals. It features a React frontend with Express.js backend and PostgreSQL database.

## Project Architecture

### Frontend (React + Vite)
- **Location**: `client/src/`
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state
- **Build Tool**: Vite with hot module replacement

### Backend (Node.js + Express)
- **Location**: `server/`
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Mock user system (user-1) for MVP
- **AI Integration**: OpenAI GPT-4 Vision for food analysis
- **External APIs**: OpenFoodFacts for barcode scanning

### Database Schema
- **Users**: Profile information, subscription plans, daily limits
- **Foods**: AI-analyzed food items with nutrition data
- **Meal Entries**: User meal logs with quantities and nutrition
- **Activities**: Exercise tracking with calorie burn calculations
- **Recipes**: User-created recipes with ingredients
- **Daily Summaries**: Aggregated nutrition data per day

## Key Features
1. **AI Food Analysis**: Photo-based calorie and nutrition estimation
2. **Barcode Scanning**: Integration with OpenFoodFacts database
3. **Activity Tracking**: Exercise logging with calorie burn calculation
4. **Recipe Management**: Create and track custom recipes
5. **Progress Tracking**: Daily and weekly nutrition summaries
6. **Premium Features**: Tiered subscription system (Free/Premium/VIP)

## Development Setup

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (auto-configured in Replit)
- `STRIPE_SECRET_KEY`: For subscription management (optional)
- `OPENAI_API_KEY`: For AI food analysis (optional)

### Development Commands
- `npm run dev`: Start development server (frontend + backend on port 5000)
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run db:push`: Apply database schema changes

### Database Configuration
The application uses PostgreSQL with Drizzle ORM. Schema is defined in `shared/schema.ts` and automatically synced using `drizzle-kit push`.

## Recent Changes
- **2024-09-24**: Initial setup in Replit environment
  - Installed all dependencies
  - Configured PostgreSQL database with proper schema
  - Set up development workflow on port 5000
  - Configured deployment for autoscale
  - Verified all API endpoints working correctly

## Architecture Decisions

### Port Configuration
- **Development**: Port 5000 (required for Replit)
- **Host**: 0.0.0.0 with allowedHosts: true for Replit proxy
- **Backend**: Serves both API and static files in production

### Database Design
- Uses UUIDs for primary keys with `gen_random_uuid()`
- Implements soft relationships between users, foods, meals, and activities
- Daily summaries table for optimized dashboard queries
- Subscription/plan system for premium features

### Security & Permissions
- Middleware-based permission system for premium features
- AI analysis rate limiting for free users
- Mock authentication system (MVP - ready for real auth integration)

## User Preferences
- Prefers full-stack TypeScript development
- Uses modern React patterns with hooks and context
- Implements responsive mobile-first design
- Focuses on performance with optimized queries and caching

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL, Drizzle ORM
- **External Services**: OpenAI, OpenFoodFacts, Stripe
- **Deployment**: Replit Autoscale deployment