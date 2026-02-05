# Fashion/Apparel ERP System

A comprehensive ERP system for managing fashion and apparel business operations including purchasing, inventory, production, and finance.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma
- **Authentication:** Supabase Auth
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod validation
- **Tables:** TanStack Table (React Table v8)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- npm or yarn

### Installation

1. **Clone the repository and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `DATABASE_URL` - PostgreSQL connection string

3. **Initialize the database:**

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed initial data
npm run db:seed
```

4. **Start the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components (sidebar, header)
│   ├── forms/             # Form components
│   ├── tables/            # Table components
│   └── shared/            # Shared components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
│   └── supabase/          # Supabase client configuration
├── services/              # Business logic services
├── stores/                # Zustand state stores
├── types/                 # TypeScript type definitions
└── validators/            # Zod validation schemas
```

## Modules

### Purchase Orders
- Create and manage purchase orders across 14 purchase types
- Support for catalog-based, free-text, and special entry modes
- Raw material issuance for job work POs
- Multi-level approval workflow

### Suppliers
- Supplier directory management
- Contact management
- SKU-level pricing

### Products
- Product catalog management
- Category hierarchy
- HSN codes and GST rates

### Inventory
- Goods Receipt Notes (GRN)
- Batch tracking
- Stock ledger with complete movement history
- Stock adjustments and write-offs

### Production
- In-house production tracking
- Job work management
- Material consumption tracking

### Finance
- Supplier payments
- Marketplace settlements
- Customer invoices
- Store credits

### Admin
- User management
- Permission system
- System settings

## Database Schema

The database schema is defined in `prisma/schema.prisma` and includes:

- **Core:** Tenants, Users, Permissions
- **Configuration:** Purchase Types, Sales Channels, Entities
- **Masters:** Suppliers, Products, Categories
- **Transactions:** Purchase Orders, GRNs, Payments
- **Inventory:** Batches, Stock Ledger, Adjustments
- **Production:** Production records, Material consumption

## Commands

```bash
# Development
npm run dev           # Start dev server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint

# Database
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:seed       # Seed initial data
npm run db:studio     # Open Prisma Studio
```

## Next Steps

After scaffolding is complete:

1. **Complete Authentication Flow**
   - Implement user registration (if needed)
   - Add password reset functionality
   - Complete permission checks in middleware

2. **Build Supplier Management** (Start here - simplest module)
   - Complete supplier form
   - Add supplier listing with search/filter
   - Implement contact management

3. **Build Product Information**
   - Complete product form
   - Add category management
   - Implement product search

4. **Build Purchase Orders**
   - Complete PO form with all entry modes
   - Implement approval workflow
   - Add PO status management

5. **Build Inventory & GRN**
   - Complete GRN form
   - Implement batch tracking
   - Build stock ledger view

6. **Build Production Module**
   - In-house production forms
   - Job work material issuance
   - Production completion tracking

7. **Build Finance Module**
   - Payment creation and approval
   - Settlement recording
   - Invoice management

8. **Build Admin Features**
   - User management
   - Permission assignment
   - System configuration

## License

Private - All rights reserved.
