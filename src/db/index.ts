import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { Pool, type PoolConfig } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import * as schema from './schema.ts';

// Add global connection pool and db caching to persist across hot-reloads
declare global {
  var _postgresPool: any | undefined;
  var _drizzleDbInstance: any | undefined;
}

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

const host = process.env.POSTGRES_HOST || process.env.SQL_HOST;
const user = process.env.POSTGRES_USER || process.env.SQL_USER;
const password = process.env.POSTGRES_PASSWORD || process.env.SQL_PASSWORD;
const database = process.env.POSTGRES_DATABASE || process.env.SQL_DB_NAME;

// Supabase requires SSL encryption. Enable SSL if connecting via connection string or remote host.
const isRemote = Boolean(
  connectionString ||
  (host && host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('/'))
);

let pgliteInitPromise: Promise<void> | null = null;

// Function to create or retrieve the database instance
function initDatabase() {
  if (global._drizzleDbInstance && global._postgresPool) {
    return { db: global._drizzleDbInstance, pool: global._postgresPool };
  }

  if (isRemote) {
    const poolConfig: PoolConfig = connectionString
      ? {
          connectionString,
          ssl: { rejectUnauthorized: false },
          max: 10,
          connectionTimeoutMillis: 15000,
        }
      : {
          host,
          user,
          password,
          database,
          ssl: { rejectUnauthorized: false },
          max: 10,
          connectionTimeoutMillis: 15000,
        };

    const pgPool = new Pool(poolConfig);
    pgPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });

    const drizzleDb = drizzlePg(pgPool, { schema });
    global._postgresPool = pgPool;
    global._drizzleDbInstance = drizzleDb;
    return { db: drizzleDb, pool: pgPool };
  } else {
    // In local sandbox environment without remote PostgreSQL credentials,
    // use PGlite (embedded WebAssembly PostgreSQL 16 engine).
    // In test environment or if PGLITE_MEMORY is set, use in-memory to prevent file locks with dev server.
    const isTest = process.env.NODE_ENV === 'test' || process.env.PGLITE_MEMORY === 'true';
    let pgliteClient: PGlite;
    const dataDir = process.env.PGLITE_DATA_DIR || path.join(process.cwd(), 'data', 'pglite_db');

    if (isTest) {
      pgliteClient = new PGlite();
    } else {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      } else {
        // Clean up stale postmaster.pid lock file if container crashed or restarted
        const lockFile = path.join(dataDir, 'postmaster.pid');
        if (fs.existsSync(lockFile)) {
          try {
            fs.unlinkSync(lockFile);
          } catch {}
        }
      }
      pgliteClient = new PGlite(dataDir);
    }

    const originalQuery = pgliteClient.query.bind(pgliteClient);
    const originalExec = pgliteClient.exec.bind(pgliteClient);

    // Async initialization promise to guarantee schema and baseline seed are ready
    pgliteInitPromise = (async () => {
      try {
        if (!pgliteClient.ready) {
          let timer: any;
          await Promise.race([
            pgliteClient.waitReady,
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('PGlite waitReady timeout')), 30000);
            }),
          ]).finally(() => {
            if (timer) clearTimeout(timer);
          });
        }
      } catch (err) {
        // Silently continue if engine is already processing queries
      }

      try {
        const tableCheck = (await originalQuery(
          "SELECT to_regclass('public.properties') as tbl;"
        )) as { rows: Array<{ tbl: string | null }> };
        const hasPropertiesTable = Boolean(tableCheck.rows[0]?.tbl);

        const ddlPath = path.join(process.cwd(), 'drizzle', '0000_shiny_leopardon.sql');
        const seedPath = path.join(process.cwd(), 'drizzle', 'seed_properties.sql');

        if (!hasPropertiesTable) {
          if (fs.existsSync(ddlPath)) {
            const ddlSql = fs.readFileSync(ddlPath, 'utf8').replace(/--> statement-breakpoint/g, '');
            await originalExec(ddlSql);
          }
        }

        // Guarantee is_archived column exists in properties table without mutating or resetting data
        await originalExec(
          'ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false NOT NULL;'
        ).catch(() => {});

        // B20 — Users & Staff table initialization
        await originalExec(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            username TEXT,
            role TEXT NOT NULL DEFAULT 'Agent',
            phone TEXT DEFAULT '',
            avatar TEXT DEFAULT '',
            branch TEXT DEFAULT 'Phuket Head Office',
            department TEXT DEFAULT 'Sales',
            title TEXT DEFAULT 'Real Estate Agent',
            is_active BOOLEAN NOT NULL DEFAULT true,
            status TEXT NOT NULL DEFAULT 'Active',
            permissions JSONB DEFAULT '["View", "Create", "Edit"]',
            monthly_target NUMERIC DEFAULT 0,
            monthly_commission NUMERIC DEFAULT 0,
            target_deals INTEGER DEFAULT 0,
            completed_deals INTEGER DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
          CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
          CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

          CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS sess_user_idx ON sessions (user_id);
          CREATE INDEX IF NOT EXISTS sess_expires_idx ON sessions (expires_at);
        `).catch((err) => {
          console.warn('Users table DDL notice:', err);
        });

        // B22 — Contracts table initialization
        await originalExec(`
          CREATE TABLE IF NOT EXISTS contracts (
            id TEXT PRIMARY KEY,
            contract_id TEXT NOT NULL UNIQUE,
            contract_type TEXT NOT NULL DEFAULT 'Rent Contract',
            status TEXT NOT NULL DEFAULT 'Active',
            sign_date TEXT NOT NULL,
            rental_start TEXT NOT NULL,
            rental_end TEXT NOT NULL,
            rental_time TEXT DEFAULT '12 Months',
            with_pet BOOLEAN NOT NULL DEFAULT false,
            property_id TEXT NOT NULL,
            agent TEXT DEFAULT '',
            agent_phone TEXT DEFAULT '',
            house_no TEXT DEFAULT '',
            project_en TEXT DEFAULT '',
            project_th TEXT DEFAULT '',
            nation TEXT DEFAULT 'Thailand',
            province TEXT DEFAULT 'Phuket',
            district TEXT DEFAULT '',
            sub_district TEXT DEFAULT '',
            road_en TEXT DEFAULT '',
            road_th TEXT DEFAULT '',
            soi_en TEXT DEFAULT '',
            soi_th TEXT DEFAULT '',
            moo_en TEXT DEFAULT '',
            moo_th TEXT DEFAULT '',
            postal_code TEXT DEFAULT '',
            house_registration_file JSONB DEFAULT NULL,
            owner_name TEXT DEFAULT '',
            landlord_certificate_type TEXT DEFAULT 'Thai ID',
            landlord_id_no TEXT DEFAULT '',
            landlord_nationality TEXT DEFAULT 'Thai',
            landlord_bank TEXT DEFAULT 'Kasikorn Bank',
            landlord_account_name TEXT DEFAULT '',
            landlord_account_no TEXT DEFAULT '',
            landlord_address_house_no TEXT DEFAULT '',
            landlord_address_project TEXT DEFAULT '',
            landlord_address_nation TEXT DEFAULT 'Thailand',
            landlord_address_province TEXT DEFAULT 'Phuket',
            landlord_address_district TEXT DEFAULT '',
            landlord_address_sub_district TEXT DEFAULT '',
            landlord_address_road TEXT DEFAULT '',
            landlord_address_soi TEXT DEFAULT '',
            landlord_address_moo TEXT DEFAULT '',
            landlord_address_postal_code TEXT DEFAULT '',
            owner_thai_id_file JSONB DEFAULT NULL,
            tenant_id TEXT DEFAULT '',
            tenant_name TEXT DEFAULT '',
            tenant_phone TEXT NOT NULL,
            tenant_nationality TEXT DEFAULT '',
            tenant_certificate_type TEXT DEFAULT 'Passport',
            tenant_id_no TEXT DEFAULT '',
            tenant_passport_file JSONB DEFAULT NULL,
            more_tenants JSONB DEFAULT '[]',
            monthly_rent NUMERIC NOT NULL DEFAULT 0,
            payment_term TEXT NOT NULL DEFAULT 'Monthly',
            monthly_rent_baht_en TEXT DEFAULT '',
            monthly_rent_baht_th TEXT DEFAULT '',
            payment_date TEXT DEFAULT '23',
            penalty_amount TEXT DEFAULT '437.50',
            price_comments TEXT DEFAULT '',
            total_price NUMERIC DEFAULT 0,
            total_price_baht_en TEXT DEFAULT '',
            total_price_baht_th TEXT DEFAULT '',
            deposit NUMERIC NOT NULL DEFAULT 0,
            deposit_baht_en TEXT DEFAULT '',
            deposit_baht_th TEXT DEFAULT '',
            advance_rental NUMERIC NOT NULL DEFAULT 0,
            advance_rental_baht_en TEXT DEFAULT '',
            advance_rental_baht_th TEXT DEFAULT '',
            commission_from_owner NUMERIC DEFAULT 0,
            commission_baht_en TEXT DEFAULT '',
            commission_baht_th TEXT DEFAULT '',
            sales_id TEXT DEFAULT '',
            sales_name TEXT NOT NULL DEFAULT '',
            sales_phone TEXT DEFAULT '',
            sales_commission TEXT NOT NULL DEFAULT '',
            comments TEXT DEFAULT '',
            attachments JSONB DEFAULT '[]',
            generated_word_files JSONB DEFAULT '[]',
            current_word_file_url TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_contracts_id ON contracts(contract_id);
          CREATE INDEX IF NOT EXISTS idx_contracts_prop ON contracts(property_id);
          CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
          CREATE INDEX IF NOT EXISTS idx_contracts_archived ON contracts(is_archived);
        `).catch((err) => {
          console.warn('Contracts table DDL notice:', err);
        });

        // B23 — Payment Management Lite table initialization
        await originalExec(`
          CREATE TABLE IF NOT EXISTS payment_schedules (
            id TEXT PRIMARY KEY,
            contract_id TEXT NOT NULL,
            property_id TEXT NOT NULL,
            payer_name TEXT DEFAULT '',
            payer_phone TEXT DEFAULT '',
            title TEXT NOT NULL,
            payment_type TEXT NOT NULL DEFAULT 'Rent',
            due_date TEXT NOT NULL,
            amount NUMERIC NOT NULL DEFAULT 0,
            paid_amount NUMERIC NOT NULL DEFAULT 0,
            remaining_amount NUMERIC NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'Pending',
            cycle_number INTEGER,
            total_cycles INTEGER,
            notes TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_sched_contract_id ON payment_schedules(contract_id);
          CREATE INDEX IF NOT EXISTS idx_sched_property_id ON payment_schedules(property_id);
          CREATE INDEX IF NOT EXISTS idx_sched_status ON payment_schedules(status);
          CREATE INDEX IF NOT EXISTS idx_sched_type ON payment_schedules(payment_type);
          CREATE INDEX IF NOT EXISTS idx_sched_due_date ON payment_schedules(due_date);
          CREATE INDEX IF NOT EXISTS idx_sched_archived ON payment_schedules(is_archived);

          CREATE TABLE IF NOT EXISTS payment_records (
            id TEXT PRIMARY KEY,
            contract_id TEXT NOT NULL,
            payment_schedule_id TEXT,
            payment_date TEXT NOT NULL,
            amount NUMERIC NOT NULL DEFAULT 0,
            payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
            bank TEXT DEFAULT '',
            account_no TEXT DEFAULT '',
            reference_no TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            receipt_file JSONB DEFAULT NULL,
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pay_rec_contract_id ON payment_records(contract_id);
          CREATE INDEX IF NOT EXISTS idx_pay_rec_sched_id ON payment_records(payment_schedule_id);
          CREATE INDEX IF NOT EXISTS idx_pay_rec_date ON payment_records(payment_date);
          CREATE INDEX IF NOT EXISTS idx_pay_rec_archived ON payment_records(is_archived);
        `).catch((err) => {
          console.warn('Payment tables DDL notice:', err);
        });

        // B24 — Viewing / Appointment Management Lite table initialization
        await originalExec(`
          CREATE TABLE IF NOT EXISTS viewings (
            id TEXT PRIMARY KEY,
            viewing_code TEXT NOT NULL UNIQUE,
            customer_id TEXT NOT NULL,
            customer_name TEXT NOT NULL DEFAULT '',
            customer_phone TEXT DEFAULT '',
            property_id TEXT NOT NULL,
            property_custom_id TEXT DEFAULT '',
            property_title TEXT DEFAULT '',
            agent_id TEXT NOT NULL,
            agent_name TEXT NOT NULL DEFAULT '',
            date_time TEXT NOT NULL,
            location TEXT NOT NULL DEFAULT '',
            notes TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Scheduled',
            feedback TEXT DEFAULT '',
            interest_score INTEGER DEFAULT 4,
            client_interest TEXT DEFAULT 'Warm',
            cancellation_reason TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_viewings_code ON viewings(viewing_code);
          CREATE INDEX IF NOT EXISTS idx_viewings_customer_id ON viewings(customer_id);
          CREATE INDEX IF NOT EXISTS idx_viewings_property_id ON viewings(property_id);
          CREATE INDEX IF NOT EXISTS idx_viewings_agent_id ON viewings(agent_id);
          CREATE INDEX IF NOT EXISTS idx_viewings_status ON viewings(status);
          CREATE INDEX IF NOT EXISTS idx_viewings_date_time ON viewings(date_time);
          CREATE INDEX IF NOT EXISTS idx_viewings_archived ON viewings(is_archived);
        `).catch((err) => {
          console.warn('Viewings table DDL notice:', err);
        });

        // B25 — Client / CRM Management Lite table initialization
        await originalExec(`
          CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            client_code TEXT NOT NULL UNIQUE,
            first_name TEXT NOT NULL DEFAULT '',
            last_name TEXT DEFAULT '',
            company_name TEXT DEFAULT '',
            phone TEXT NOT NULL,
            email TEXT DEFAULT '',
            nationality TEXT DEFAULT 'Thai',
            id_number TEXT DEFAULT '',
            client_type TEXT NOT NULL DEFAULT 'Buyer',
            intent TEXT DEFAULT 'Buy',
            budget_min NUMERIC DEFAULT 0,
            budget_max NUMERIC DEFAULT 0,
            property_type TEXT DEFAULT 'Villa',
            preferred_location TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'New',
            lead_source TEXT DEFAULT 'Website',
            lost_reason TEXT DEFAULT '',
            assigned_agent_id TEXT NOT NULL DEFAULT 'user-admin-1',
            assigned_agent_name TEXT NOT NULL DEFAULT 'Administrator',
            next_follow_up_date TEXT,
            notes TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          ALTER TABLE clients ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'Website';
          ALTER TABLE clients ADD COLUMN IF NOT EXISTS lost_reason TEXT DEFAULT '';
          CREATE INDEX IF NOT EXISTS idx_clients_code ON clients(client_code);
          CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
          CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
          CREATE INDEX IF NOT EXISTS idx_clients_lead_source ON clients(lead_source);
          CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(client_type);
          CREATE INDEX IF NOT EXISTS idx_clients_agent ON clients(assigned_agent_id);
          CREATE INDEX IF NOT EXISTS idx_clients_archived ON clients(is_archived);
          CREATE INDEX IF NOT EXISTS idx_clients_created ON clients(created_at);

          CREATE TABLE IF NOT EXISTS client_properties (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            property_id TEXT NOT NULL,
            property_custom_id TEXT DEFAULT '',
            property_title TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_cl_prop_client_id ON client_properties(client_id);
          CREATE INDEX IF NOT EXISTS idx_cl_prop_property_id ON client_properties(property_id);

          CREATE TABLE IF NOT EXISTS client_follow_ups (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            title TEXT DEFAULT '',
            follow_up_date TEXT NOT NULL,
            follow_up_time TEXT DEFAULT '10:00',
            follow_up_note TEXT NOT NULL,
            notes TEXT DEFAULT '',
            priority TEXT DEFAULT 'Normal',
            assigned_agent_id TEXT NOT NULL,
            assigned_agent_name TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Pending',
            completed_at TIMESTAMP,
            cancelled_at TIMESTAMP,
            cancel_reason TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          ALTER TABLE client_follow_ups ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
          ALTER TABLE client_follow_ups ADD COLUMN IF NOT EXISTS follow_up_time TEXT DEFAULT '10:00';
          ALTER TABLE client_follow_ups ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
          ALTER TABLE client_follow_ups ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal';
          ALTER TABLE client_follow_ups ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
          ALTER TABLE client_follow_ups ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT '';
          ALTER TABLE client_follow_ups ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
          ALTER TABLE client_follow_ups ADD COLUMN IF NOT EXISTS created_by TEXT;
          ALTER TABLE client_follow_ups ADD COLUMN IF NOT EXISTS created_by_name TEXT;
          ALTER TABLE client_follow_ups ADD COLUMN IF NOT EXISTS updated_by TEXT;
          CREATE INDEX IF NOT EXISTS idx_cl_fu_client_id ON client_follow_ups(client_id);
          CREATE INDEX IF NOT EXISTS idx_cl_fu_agent_id ON client_follow_ups(assigned_agent_id);
          CREATE INDEX IF NOT EXISTS idx_cl_fu_date ON client_follow_ups(follow_up_date);
          CREATE INDEX IF NOT EXISTS idx_cl_fu_status ON client_follow_ups(status);
          CREATE INDEX IF NOT EXISTS idx_cl_fu_archived ON client_follow_ups(is_archived);

          -- B28 System Administration, Roles, Overrides, Settings
          CREATE TABLE IF NOT EXISTS system_settings (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            data JSONB NOT NULL DEFAULT '{}',
            updated_by TEXT,
            updated_by_name TEXT,
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_sys_set_cat ON system_settings(category);

          CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            permissions JSONB NOT NULL DEFAULT '[]',
            is_system BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

          CREATE TABLE IF NOT EXISTS user_permission_overrides (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            permission_key TEXT NOT NULL,
            granted BOOLEAN NOT NULL,
            granted_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_u_perm_user ON user_permission_overrides(user_id);
          CREATE INDEX IF NOT EXISTS idx_u_perm_key ON user_permission_overrides(permission_key);

          -- B30 — Property Operations Tables
          CREATE TABLE IF NOT EXISTS check_in_outs (
            id TEXT PRIMARY KEY,
            record_number TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL DEFAULT 'Check-in',
            property_id TEXT NOT NULL,
            property_custom_id TEXT DEFAULT '',
            property_title TEXT DEFAULT '',
            customer_id TEXT DEFAULT '',
            customer_name TEXT DEFAULT '',
            tenant_name TEXT DEFAULT '',
            tenant_phone TEXT DEFAULT '',
            contract_id TEXT DEFAULT '',
            agent_id TEXT DEFAULT '',
            agent_name TEXT DEFAULT '',
            inspector_id TEXT DEFAULT '',
            inspector_name TEXT DEFAULT '',
            recipient_name TEXT DEFAULT '',
            date TEXT NOT NULL,
            electricity_meter NUMERIC DEFAULT 0,
            water_meter NUMERIC DEFAULT 0,
            electricity_meter_image TEXT DEFAULT '',
            water_meter_image TEXT DEFAULT '',
            key_sets_delivered INTEGER DEFAULT 0,
            access_card_delivered INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'Draft',
            condition_report JSONB DEFAULT '[]',
            damages JSONB DEFAULT '[]',
            deposit_amount NUMERIC DEFAULT 0,
            deposit_deductions NUMERIC DEFAULT 0,
            deposit_refunded NUMERIC DEFAULT 0,
            deposit_status TEXT DEFAULT 'Pending Calculation',
            photos JSONB DEFAULT '[]',
            notes TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_chk_rec_no ON check_in_outs(record_number);
          CREATE INDEX IF NOT EXISTS idx_chk_prop_id ON check_in_outs(property_id);
          CREATE INDEX IF NOT EXISTS idx_chk_cust_id ON check_in_outs(customer_id);
          CREATE INDEX IF NOT EXISTS idx_chk_contract_id ON check_in_outs(contract_id);
          CREATE INDEX IF NOT EXISTS idx_chk_type ON check_in_outs(type);
          CREATE INDEX IF NOT EXISTS idx_chk_status ON check_in_outs(status);
          CREATE INDEX IF NOT EXISTS idx_chk_date ON check_in_outs(date);
          CREATE INDEX IF NOT EXISTS idx_chk_archived ON check_in_outs(is_archived);

          CREATE TABLE IF NOT EXISTS maintenance_tickets (
            id TEXT PRIMARY KEY,
            ticket_number TEXT NOT NULL UNIQUE,
            property_id TEXT NOT NULL,
            property_custom_id TEXT DEFAULT '',
            property_title TEXT DEFAULT '',
            contract_id TEXT DEFAULT '',
            customer_id TEXT DEFAULT '',
            customer_name TEXT DEFAULT '',
            room_no TEXT DEFAULT '',
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT 'General',
            priority TEXT NOT NULL DEFAULT 'Medium',
            status TEXT NOT NULL DEFAULT 'New',
            reported_by TEXT DEFAULT '',
            reporter_phone TEXT DEFAULT '',
            reporter_type TEXT DEFAULT 'Tenant',
            assigned_to_id TEXT DEFAULT '',
            assigned_to_name TEXT DEFAULT '',
            vendor_name TEXT DEFAULT '',
            vendor_phone TEXT DEFAULT '',
            vendor_cost NUMERIC DEFAULT 0,
            estimated_cost NUMERIC DEFAULT 0,
            actual_cost NUMERIC DEFAULT 0,
            cost NUMERIC DEFAULT 0,
            paid_by TEXT DEFAULT 'Owner',
            payment_status TEXT DEFAULT 'Unpaid',
            photos JSONB DEFAULT '[]',
            completion_photos JSONB DEFAULT '[]',
            resolution_history JSONB DEFAULT '[]',
            scheduled_date TEXT,
            resolved_at TEXT,
            closed_at TEXT,
            notes TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_mnt_ticket_no ON maintenance_tickets(ticket_number);
          CREATE INDEX IF NOT EXISTS idx_mnt_prop_id ON maintenance_tickets(property_id);
          CREATE INDEX IF NOT EXISTS idx_mnt_contract_id ON maintenance_tickets(contract_id);
          CREATE INDEX IF NOT EXISTS idx_mnt_status ON maintenance_tickets(status);
          CREATE INDEX IF NOT EXISTS idx_mnt_priority ON maintenance_tickets(priority);
          CREATE INDEX IF NOT EXISTS idx_mnt_category ON maintenance_tickets(category);
          CREATE INDEX IF NOT EXISTS idx_mnt_archived ON maintenance_tickets(is_archived);
          CREATE INDEX IF NOT EXISTS idx_mnt_created ON maintenance_tickets(created_at);

          CREATE TABLE IF NOT EXISTS property_expenses (
            id TEXT PRIMARY KEY,
            expense_number TEXT NOT NULL UNIQUE,
            property_id TEXT NOT NULL,
            property_custom_id TEXT DEFAULT '',
            property_title TEXT DEFAULT '',
            contract_id TEXT DEFAULT '',
            maintenance_ticket_id TEXT DEFAULT '',
            title TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'Maintenance',
            amount NUMERIC NOT NULL DEFAULT 0,
            date TEXT NOT NULL,
            paid_by TEXT NOT NULL DEFAULT 'Owner',
            paid_to TEXT DEFAULT '',
            payment_method TEXT DEFAULT 'Bank Transfer',
            status TEXT NOT NULL DEFAULT 'Paid',
            receipt_url TEXT DEFAULT '',
            receipt_file JSONB DEFAULT null,
            notes TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_exp_number ON property_expenses(expense_number);
          CREATE INDEX IF NOT EXISTS idx_exp_prop_id ON property_expenses(property_id);
          CREATE INDEX IF NOT EXISTS idx_exp_category ON property_expenses(category);
          CREATE INDEX IF NOT EXISTS idx_exp_date ON property_expenses(date);
          CREATE INDEX IF NOT EXISTS idx_exp_status ON property_expenses(status);
          CREATE INDEX IF NOT EXISTS idx_exp_paid_by ON property_expenses(paid_by);
          CREATE INDEX IF NOT EXISTS idx_exp_archived ON property_expenses(is_archived);

          CREATE TABLE IF NOT EXISTS property_history (
            id TEXT PRIMARY KEY,
            property_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            reference_type TEXT DEFAULT '',
            reference_id TEXT DEFAULT '',
            old_value TEXT DEFAULT '',
            new_value TEXT DEFAULT '',
            actor_id TEXT DEFAULT '',
            actor_name TEXT DEFAULT '',
            actor_role TEXT DEFAULT '',
            metadata JSONB DEFAULT '{}',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_hist_prop_id ON property_history(property_id);
          CREATE INDEX IF NOT EXISTS idx_hist_event_type ON property_history(event_type);
          CREATE INDEX IF NOT EXISTS idx_hist_created ON property_history(created_at);
          CREATE INDEX IF NOT EXISTS idx_hist_archived ON property_history(is_archived);

          -- B30 — Dedicated Maintenance Requests, Costs, Vendors, and Preventive Maintenance
          CREATE TABLE IF NOT EXISTS maintenance_vendors (
            id TEXT PRIMARY KEY,
            vendor_code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            company TEXT DEFAULT '',
            phone TEXT NOT NULL,
            email TEXT DEFAULT '',
            service_type TEXT NOT NULL DEFAULT 'General',
            rating NUMERIC DEFAULT 5.0,
            is_active BOOLEAN NOT NULL DEFAULT true,
            notes TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_vnd_code ON maintenance_vendors(vendor_code);
          CREATE INDEX IF NOT EXISTS idx_vnd_type ON maintenance_vendors(service_type);
          CREATE INDEX IF NOT EXISTS idx_vnd_active ON maintenance_vendors(is_active);
          CREATE INDEX IF NOT EXISTS idx_vnd_archived ON maintenance_vendors(is_archived);

          CREATE TABLE IF NOT EXISTS maintenance_requests (
            id TEXT PRIMARY KEY,
            ticket_number TEXT NOT NULL UNIQUE,
            property_id TEXT NOT NULL,
            property_custom_id TEXT DEFAULT '',
            property_title TEXT DEFAULT '',
            customer_id TEXT DEFAULT '',
            customer_name TEXT DEFAULT '',
            contract_id TEXT DEFAULT '',
            title TEXT NOT NULL,
            problem TEXT NOT NULL DEFAULT '',
            solution TEXT DEFAULT '',
            category TEXT NOT NULL DEFAULT 'General',
            priority TEXT NOT NULL DEFAULT 'Normal',
            status TEXT NOT NULL DEFAULT 'Open',
            assigned_agent_id TEXT DEFAULT '',
            assigned_agent_name TEXT DEFAULT '',
            assigned_vendor_id TEXT DEFAULT '',
            assigned_vendor_name TEXT DEFAULT '',
            due_date TEXT,
            start_date TEXT,
            completed_date TEXT,
            total_cost NUMERIC NOT NULL DEFAULT 0,
            paid_amount NUMERIC NOT NULL DEFAULT 0,
            outstanding_amount NUMERIC NOT NULL DEFAULT 0,
            paid_by TEXT DEFAULT 'Owner',
            attachments JSONB DEFAULT '[]',
            notes TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_mnt_req_ticket ON maintenance_requests(ticket_number);
          CREATE INDEX IF NOT EXISTS idx_mnt_req_prop ON maintenance_requests(property_id);
          CREATE INDEX IF NOT EXISTS idx_mnt_req_cust ON maintenance_requests(customer_id);
          CREATE INDEX IF NOT EXISTS idx_mnt_req_status ON maintenance_requests(status);
          CREATE INDEX IF NOT EXISTS idx_mnt_req_priority ON maintenance_requests(priority);
          CREATE INDEX IF NOT EXISTS idx_mnt_req_vendor ON maintenance_requests(assigned_vendor_id);
          CREATE INDEX IF NOT EXISTS idx_mnt_req_agent ON maintenance_requests(assigned_agent_id);
          CREATE INDEX IF NOT EXISTS idx_mnt_req_archived ON maintenance_requests(is_archived);
          CREATE INDEX IF NOT EXISTS idx_mnt_req_created ON maintenance_requests(created_at);

          CREATE TABLE IF NOT EXISTS maintenance_costs (
            id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL,
            item_type TEXT NOT NULL DEFAULT 'Labor',
            description TEXT NOT NULL,
            amount NUMERIC NOT NULL DEFAULT 0,
            paid_amount NUMERIC NOT NULL DEFAULT 0,
            is_paid BOOLEAN NOT NULL DEFAULT false,
            paid_by TEXT DEFAULT 'Owner',
            payment_method TEXT DEFAULT 'Bank Transfer',
            receipt_url TEXT DEFAULT '',
            payment_record_id TEXT DEFAULT '',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_mnt_cost_req ON maintenance_costs(request_id);
          CREATE INDEX IF NOT EXISTS idx_mnt_cost_type ON maintenance_costs(item_type);

          CREATE TABLE IF NOT EXISTS preventive_maintenance (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            property_id TEXT NOT NULL,
            property_custom_id TEXT DEFAULT '',
            property_title TEXT DEFAULT '',
            title TEXT NOT NULL,
            service_type TEXT NOT NULL DEFAULT 'Air Conditioner',
            cycle_months INTEGER NOT NULL DEFAULT 3,
            last_service_date TEXT,
            next_due_date TEXT NOT NULL,
            reminder_days INTEGER NOT NULL DEFAULT 7,
            assigned_vendor_id TEXT DEFAULT '',
            assigned_vendor_name TEXT DEFAULT '',
            assigned_agent_id TEXT DEFAULT '',
            assigned_agent_name TEXT DEFAULT '',
            estimated_cost NUMERIC DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'Active',
            notes TEXT DEFAULT '',
            is_archived BOOLEAN NOT NULL DEFAULT false,
            created_by TEXT,
            created_by_name TEXT,
            updated_by TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
          CREATE INDEX IF NOT EXISTS idx_pm_code ON preventive_maintenance(code);
          CREATE INDEX IF NOT EXISTS idx_pm_prop ON preventive_maintenance(property_id);
          CREATE INDEX IF NOT EXISTS idx_pm_due ON preventive_maintenance(next_due_date);
          CREATE INDEX IF NOT EXISTS idx_pm_status ON preventive_maintenance(status);
          CREATE INDEX IF NOT EXISTS idx_pm_archived ON preventive_maintenance(is_archived);
        `).catch((err) => {
          console.warn('B30 tables DDL notice:', err);
        });

        // Seed default roles if roles table is empty
        await originalExec(`
          INSERT INTO roles (id, name, description, permissions, is_system)
          VALUES
          ('admin', 'Administrator', 'Full system access and security administration', '["properties:view","properties:create","properties:edit","properties:delete","properties:export","properties:view_owner","clients:view","clients:create","clients:edit","clients:delete","clients:export","clients:assign","viewings:view","viewings:create","viewings:edit","viewings:delete","viewings:feedback","contracts:view","contracts:create","contracts:edit","contracts:delete","contracts:download_word","payments:view","payments:create","payments:edit","payments:record_payment","users:view","users:create","users:edit","users:disable","users:manage_roles","settings:view","settings:edit_system","settings:edit_business","settings:edit_numbering","settings:backup_restore","audit_logs:view","audit_logs:export","maintenance:view","maintenance:create","maintenance:edit","maintenance:delete","maintenance:assign","maintenance:approve","maintenance:cost","maintenance:export"]', true),
          ('manager', 'Manager', 'Branch management, sales pipeline oversight and team coordination', '["properties:view","properties:create","properties:edit","properties:archive","properties:export","properties:view_owner","clients:view","clients:create","clients:edit","clients:export","clients:assign","viewings:view","viewings:create","viewings:edit","viewings:feedback","contracts:view","contracts:create","contracts:edit","contracts:download_word","payments:view","payments:record_payment","users:view","settings:view","audit_logs:view","reports:view","reports:export","reports:financial","maintenance:view","maintenance:create","maintenance:edit","maintenance:delete","maintenance:assign","maintenance:approve","maintenance:cost","maintenance:export"]', true),
          ('agent', 'Agent', 'Property listings, client management, viewings and contracts', '["properties:view","properties:create","properties:edit","properties:export","properties:view_owner","clients:view","clients:create","clients:edit","viewings:view","viewings:create","viewings:edit","viewings:feedback","contracts:view","contracts:create","payments:view","reports:view","maintenance:view","maintenance:create","maintenance:edit","maintenance:assign","maintenance:cost","maintenance:export"]', true),
          ('staff', 'Staff', 'Operational view, maintenance tickets and basic inspection data', '["properties:view","viewings:view","payments:view","maintenance:view","maintenance:create","maintenance:edit","maintenance:cost"]', true)
          ON CONFLICT (id) DO UPDATE SET permissions = EXCLUDED.permissions;
        `).catch(() => {});

        // Seed default system_settings if empty
        await originalExec(`
          INSERT INTO system_settings (id, category, data, updated_by_name)
          VALUES
          ('system', 'system', '{"systemName":"PEAK REAL ESTATE","siteTitle":"PEAK REAL ESTATE — Luxury Property CRM","timezone":"Asia/Bangkok","defaultLanguage":"th","maintenanceMode":false,"sessionTimeoutMinutes":120}', 'System Initializer'),
          ('business', 'business', '{"companyName":"PEAK REAL ESTATE","companySubtitle":"พีค เรียล เอสเตท","taxId":"0835564012345","branch":"Phuket Head Office","defaultCommissionRate":3.0,"vatRate":7.0,"companyAddress":"124/8 Moo 5, Rawai, Mueang Phuket, Phuket 83130","contactPhone":"076-684-900","contactEmail":"contact@peakrealestate.com"}', 'System Initializer'),
          ('numbering', 'numbering', '{"propertyPrefix":"PROP-","propertyPadding":4,"propertyNextSeq":1001,"contractPrefix":"CNT-","contractPadding":4,"contractNextSeq":1001,"viewingPrefix":"VW-","viewingPadding":4,"viewingNextSeq":1001,"paymentPrefix":"PAY-","paymentPadding":4,"paymentNextSeq":1001,"clientPrefix":"CLI-","clientPadding":4,"clientNextSeq":1001}', 'System Initializer'),
          ('notification', 'notification', '{"emailAlerts":true,"inAppAlerts":true,"contractExpiryNoticeDays":30,"followUpReminderHours":24,"recipientEmails":["admin@peakrealestate.com","operations@peakrealestate.com"]}', 'System Initializer')
          ON CONFLICT (id) DO NOTHING;
        `).catch(() => {});

        // Seed baseline users if users table is empty
        const userCountCheck = (await originalQuery(
          'SELECT COUNT(*) as count FROM users;'
        )) as { rows: Array<{ count: string | number }> };
        const userCount = Number(userCountCheck.rows[0]?.count || 0);

        if (userCount === 0) {
          const defaultPasswordHash = 'a1b2c3d4e5f60718293a4b5c6d7e8f90:ecfc08ff49d2f18757e682999d4d0645456c1a3f693b326ef271c88c13cf569ac09b54c48a50bc1020c586b4004003ee333c733e6a00560948c8c9818fc30f7c';
          await originalExec(`
            INSERT INTO users (id, name, email, username, role, phone, avatar, branch, department, title, is_active, status, permissions, monthly_target, monthly_commission, target_deals, completed_deals, password_hash)
            VALUES
            ('user-admin-1', 'Administrator', 'admin@peakrealestate.com', 'administrator', 'Admin', '081-899-7701', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80', 'Headquarters (Phuket)', 'Executive Management', 'Managing Director & Lead Broker', true, 'Active', '["View", "Create", "Edit", "Archive", "Restore"]', 50000000, 1500000, 10, 8, '${defaultPasswordHash}'),
            ('user-mgr-1', 'Nichada Prasert', 'nichada@peakrealestate.com', 'manager_nichada', 'Manager', '089-445-1234', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&h=200&q=80', 'Headquarters (Phuket)', 'Operations & Sales', 'Senior Operations & Sales Manager', true, 'Active', '["View", "Create", "Edit", "Archive", "Restore"]', 30000000, 750000, 8, 6, '${defaultPasswordHash}'),
            ('user-agt-1', 'Kittisak Vong', 'kittisak@peakrealestate.com', 'agent_kittisak', 'Agent', '092-778-9901', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80', 'Bang Tao Branch', 'Sales', 'Luxury Villa Specialist', true, 'Active', '["View", "Create", "Edit"]', 25000000, 500000, 6, 4, '${defaultPasswordHash}'),
            ('usr-1', 'Somchai Prasert', 'somchai@peakrealestate.com', 'agent_somchai', 'Agent', '081-234-5678', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80', 'Rawai Branch', 'Sales', 'Senior Property Consultant', true, 'Active', '["View", "Create", "Edit"]', 20000000, 400000, 5, 3, '${defaultPasswordHash}')
            ON CONFLICT (email) DO NOTHING;
          `).catch((err) => {
            console.warn('Users baseline seed notice:', err);
          });
        }
        // Ensure any existing user without a password has the default password hash populated
        await originalExec(`
          UPDATE users
          SET password_hash = 'a1b2c3d4e5f60718293a4b5c6d7e8f90:ecfc08ff49d2f18757e682999d4d0645456c1a3f693b326ef271c88c13cf569ac09b54c48a50bc1020c586b4004003ee333c733e6a00560948c8c9818fc30f7c'
          WHERE password_hash IS NULL OR password_hash = '';
        `).catch(() => {});
      } catch (e) {
        console.warn('Failed to auto-execute DDL on PGlite:', e);
      }
    })();

    // Intercept client query to ensure initialization has completed before executing external queries
    (pgliteClient as any).query = async (queryText: string, params?: any[], options?: any) => {
      if (pgliteInitPromise) {
        await pgliteInitPromise;
      }
      return originalQuery(queryText, params, options);
    };

    const drizzleDb = drizzlePglite(pgliteClient, { schema });

    // Pool compatible interface for any pg.Pool callers
    const poolProxy = {
      query: (text: string, params?: any[]) => pgliteClient.query(text, params),
      on: () => poolProxy,
      connect: async () => ({
        query: (text: string, params?: any[]) => pgliteClient.query(text, params),
        release: () => {},
      }),
      end: async () => {
        try {
          if (pgliteClient && typeof pgliteClient.close === 'function') {
            await pgliteClient.close();
          }
        } catch {}
      },
    };

    global._postgresPool = poolProxy;
    global._drizzleDbInstance = drizzleDb;
    return { db: drizzleDb, pool: poolProxy };
  }
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (isRemote) return;
  if (pgliteInitPromise) {
    await pgliteInitPromise;
  }
}

const { db: currentDb, pool: currentPool } = initDatabase();

export const pool = currentPool;
export const db = currentDb;
export { schema };

