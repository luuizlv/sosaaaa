# Overview

This is a full-stack betting dashboard application called "SOSA" built with React, Express.js, and PostgreSQL. The application allows users to track their betting activities across different bet types (surebet, giros, superodd, DNC, gastos, bingos, extração), visualize profits/losses with interactive charts, and manage their betting history with detailed filtering options. The dashboard features a modern dark OLED theme with wine red and gold colors, Brazilian Portuguese localization, and currency formatting in Brazilian Reais (BRL).

# User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**August 22, 2025**
- Complete rebranding from "Hermes" to "SOSA"
- Implemented dark OLED theme with wine red/dark/gold color palette
- Updated logo to new SOSA branding
- Removed "All Months" filter option from sidebar
- Implemented new betting history organization:
  - "Apostas Recentes" shows only today's bets with timestamps
  - "Apostas Feitas" appears only when specific month is selected, shows dates instead of times
  - Automatic daily cleanup system moves today's bets to monthly archives

**August 21, 2025**
- Migrated authentication from Replit Auth to Supabase Auth for Vercel deployment compatibility
- Updated login system: username-only registration, email/username login support
- Configured for deployment on Vercel with Supabase backend
- Removed MFA/email confirmation requirements for easier user onboarding

# System Architecture

## Frontend Architecture
The frontend is built with React 18 using Vite as the build tool and bundler. The application uses a component-based architecture with:

- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design system
- **Styling**: Tailwind CSS with custom CSS variables for theming, implementing a dark theme with custom color palette
- **Charts**: Recharts for data visualization of profit/loss trends
- **Forms**: React Hook Form with Zod validation for type-safe form handling

The frontend follows a modern React patterns approach with custom hooks for authentication and API interactions. Components are organized into pages, reusable UI components, and feature-specific components.

## Backend Architecture
The backend uses Express.js with TypeScript, implementing a RESTful API architecture:

- **API Design**: RESTful endpoints for CRUD operations on bets and user data
- **Middleware**: Custom request logging, error handling, and authentication middleware
- **Database Layer**: Drizzle ORM for type-safe database operations and query building
- **Session Management**: Express sessions with PostgreSQL storage for persistence

The server implements a storage abstraction pattern through an IStorage interface, making it easy to swap database implementations while maintaining consistent business logic.

## Data Storage Solutions
The application uses PostgreSQL as the primary database with Supabase as the serverless PostgreSQL provider:

- **Schema Design**: Well-structured tables for users, bets, and sessions with proper relationships
- **Type Safety**: Drizzle ORM provides compile-time type safety for database operations
- **Migrations**: Drizzle Kit handles database schema migrations and versioning
- **Connection Pooling**: Supabase PostgreSQL connection pooling for efficient database access

The database schema includes support for different bet types through PostgreSQL enums and stores monetary values as decimal types for precision. Users table updated to work with Supabase Auth UUID system.

## Authentication and Authorization
Authentication is handled through Supabase Auth for Vercel deployment compatibility:

- **Provider**: Supabase Auth with email/password authentication
- **Token Management**: JWT tokens stored in localStorage for client-side state
- **Authorization**: Bearer token authentication with isAuthenticated middleware
- **User Management**: Automatic user creation and profile management through Supabase Auth API
- **Frontend Integration**: Custom useAuth hook with login, logout, and user state management

The authentication system supports secure login/signup with email verification and is fully compatible with Vercel deployments.

## External Dependencies

- **Database**: Supabase serverless PostgreSQL for data persistence
- **Authentication**: Supabase Auth for user authentication and session management
- **UI Components**: Radix UI primitives for accessible, unstyled components
- **Charts**: Recharts library for interactive data visualization
- **Styling**: Tailwind CSS for utility-first styling approach
- **Build Tools**: Vite for fast development and optimized production builds
- **ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod for runtime type validation and schema definition
- **HTTP Client**: Native fetch API with JWT token authentication