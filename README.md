<div align="center">

# INTERSPORT Backoffice

**From customer order to collection — one place to manage the entire process.**

Order management · Print production · Customer tracking · Team communication

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)

</div>

---

## About

INTERSPORT Backoffice helps stores, purchasing teams, head office, and the print department coordinate orders for customers and sports clubs.

The application brings order details, article availability, print instructions, customer approvals, and communication together. Customers can follow their order through a personal tracking link without creating an account.

The application interface is in Dutch.

## Features

| Area | Capabilities |
| --- | --- |
| **Order management** | Create and edit orders with product lines, quantities, sizes, suppliers, deadlines, and multiple customer email addresses. |
| **Purchasing** | Assign purchasing to the buying team or store, mark articles as in stock, or record that the seller has already ordered them. |
| **Production tracking** | Manage article and print statuses separately, including expected deliveries and collection readiness. |
| **Print workflow** | Upload print proofs, manage customer files, record print instructions, and capture personalisation per article. |
| **Customer approvals** | Let customers approve or reject print proofs through their tracking page. |
| **Customer conversations** | Exchange messages within an order, assign conversations to a team or employee, and track open questions. |
| **Notifications** | Send customer updates, internal arrival notifications, and scheduled reminders through Microsoft Graph or SMTP. |
| **Business settings** | Configure dropdowns, email templates, required fields, company details, and store defaults. |
| **Personal preferences** | Customise dashboard and notification preferences for individual employees. |
| **Access control** | Give stores, head office, purchasing, print staff, and administrators access according to their role. |

## How it works

1. **Create an order** with customer information, articles, and optional print requirements.
2. **Coordinate purchasing** and record article availability and expected delivery.
3. **Prepare print work** and request customer approval when needed.
4. **Keep everyone informed** through status updates, reminders, and order conversations.
5. **Complete the order** and notify the customer when it is ready for collection.

## Technology

| Layer | Technology |
| --- | --- |
| Application | Next.js 16 with App Router |
| User interface | React 19, TypeScript, Tailwind CSS 4 |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File storage | Supabase Storage |
| Email | Microsoft Graph or SMTP through Nodemailer |
| Access rules | Server-side checks and PostgreSQL Row Level Security |
| Tests | Node.js test runner with mocked database and email dependencies |

## Repository structure

```text
backoffice/
├── app/                     # Pages, layouts, and API routes
├── components/              # Forms, dashboards, and shared interface components
├── lib/                     # Business rules, email handling, and Supabase clients
├── public/                  # Static assets
├── supabase/
│   └── migrations/          # Database changes
├── tests/                   # Behaviour and regression tests
├── .env.example             # Environment configuration template
├── GEBRUIKERSHANDLEIDING.md  # Dutch user guide
└── package.json             # Application dependencies and scripts
```

## Local development

### 1. Install dependencies

From the repository root:

```bash
cd backoffice
npm ci
```

### 2. Configure the environment

Create `backoffice/.env.local` using `.env.example` as a starting point.

Core configuration:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Keep the service role key and mail credentials on the server. Do not commit `.env.local`.

### 3. Prepare Supabase

The application requires its database tables, access policies, authentication configuration, and the `print-files` storage bucket.

Database changes are stored in `backoffice/supabase/migrations/`. Apply the migrations required by your database before running the corresponding application features.

**Migration dependencies matter:** dropdown settings must exist before business settings, and later features depend on the earlier schema and security changes. Review the existing database and migration history before applying SQL; the repository includes two business-settings migration files.

For password recovery, allow the appropriate callback URLs in Supabase Auth:

```text
http://localhost:3000/auth/recovery
https://your-app-domain/auth/recovery
```

Password recovery emails are sent by Supabase Auth, separately from order emails.

### 4. Start the application

```bash
npm run dev
```

Open **http://localhost:3000**.

Users need an assigned role and, for store accounts, a store association to access the relevant orders.

## Email and reminders

Order emails support either **Microsoft Graph** or **SMTP**.

| Provider | Environment variables |
| --- | --- |
| Microsoft Graph | `MAIL_PROVIDER=microsoft-graph`, `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MAIL_SENDER_ADDRESS` |
| SMTP | `MAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` |

Optional sender settings include `MAIL_FROM` and `MAIL_REPLY_TO`.

Set `NEXT_PUBLIC_APP_URL` to the public application URL so emails contain the correct customer tracking and employee order links.

Scheduled reminders use:

```text
/api/reminders/orders
```

Configure `CRON_SECRET` or `REMINDER_CRON_SECRET` for the reminder endpoint. The included `vercel.json` schedules it daily at **07:00 UTC**.

## Validation

Run these commands from `backoffice/`:

```bash
# Behaviour and regression tests
node --test tests/*.test.mjs

# Lint
npm run lint

# Production build
npm run build
```

The automated tests use mocks for external services. Database migrations, access policies, actual email delivery, and customer approval flows also need verification in a configured test environment.

## Production

Use `backoffice/` as the application root.

```bash
npm run build
npm run start
```

Before rollout:

- Apply the required database migrations.
- Configure production environment variables and the public application URL.
- Set Supabase Auth site and recovery redirect URLs.
- Configure the email provider and scheduled reminders.
- Verify access for the different employee roles and customer tracking pages.

## Documentation

📖 **[Dutch user guide](backoffice/GEBRUIKERSHANDLEIDING.md)**  
Instructions for stores, head office, purchasing, print staff, administrators, and customers.

🗃️ **[Database migrations](backoffice/supabase/migrations/)**  
Schema changes and database access rules.

🧪 **[Tests](backoffice/tests/)**  
Behaviour checks for business settings, dropdowns, personalisation, customer conversations, and email policies.
