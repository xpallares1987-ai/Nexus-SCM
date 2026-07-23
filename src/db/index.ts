import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema.ts';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Use an in-memory database or local file
const client = new PGlite('./local_pg_data');

export const db = drizzle(client, { schema });

/**
 * Utility function to add a column dynamically to a table only if it does not already exist.
 * This completely prevents "column already exists" or "relation already exists" errors in the console.
 */
async function addColumnIfNotExist(tableName: string, columnName: string, columnTypeAndConstraint: string) {
  try {
    const res = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2",
      [tableName, columnName]
    );
    if (res.rows.length === 0) {
      await client.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnTypeAndConstraint}`);
      console.log(`Added column ${columnName} to ${tableName}`);
    }
  } catch (e: any) {
    if (e?.message && e.message.includes('already exists')) {
      return;
    }
    console.error(`Error adding column ${columnName} to table ${tableName}:`, e);
  }
}

// Initialize schema on startup
export const dbInitPromise = client.waitReady.then(async () => {
  try {
    const res = await client.query("SELECT to_regclass('users')");
    if (!(res.rows[0] as any).to_regclass) {
      console.log("Initializing database schema from drizzle/0000_gorgeous_orphan.sql...");
      const sql = fs.readFileSync(path.resolve('./drizzle/0000_gorgeous_orphan.sql'), 'utf-8');
      await client.exec(sql);
      console.log("Database schema initialized.");
    } else {
      // Ensure 'weight' column exists on shipments
      await addColumnIfNotExist('shipments', 'weight', 'text');
      
      // Seed some random weights for existing shipments if needed
      try {
        await client.query("UPDATE shipments SET weight = floor(random() * 5000 + 1000)::text WHERE weight IS NULL");
      } catch (e) {
        // Ignored
      }
    }

    // Ensure shipment_documents version control columns exist dynamically and safely
    await addColumnIfNotExist('shipment_documents', 'version', 'integer DEFAULT 1 NOT NULL');
    await addColumnIfNotExist('shipment_documents', 'parent_document_id', 'uuid');
    await addColumnIfNotExist('shipment_documents', 'comments', 'text');
    await addColumnIfNotExist('shipment_documents', 'file_size', 'text');
    await addColumnIfNotExist('shipment_documents', 'extracted_metadata', 'jsonb');
    await addColumnIfNotExist('shipment_documents', 'tags', 'text[]');
    await addColumnIfNotExist('shipment_documents', 'folder_id', 'uuid');
    await addColumnIfNotExist('shipment_documents', 'expiry_date', 'timestamp');
    await addColumnIfNotExist('compliance_documents', 'expiry_date', 'timestamp');
      try {
        await client.query("CREATE TABLE IF NOT EXISTS document_folders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, parent_id uuid, created_at timestamp NOT NULL DEFAULT now())");
        console.log("Created document_folders table");
      } catch (e) {
        console.error("Error creating document_folders:", e);
      }
      try {
        await client.query("CREATE TABLE IF NOT EXISTS notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text, target_role text, type text NOT NULL, message text NOT NULL, is_read integer NOT NULL DEFAULT 0, reference_id text, created_at timestamp NOT NULL DEFAULT now())");
        console.log("Created notifications table");
      } catch (e) {
        console.error("Error creating notifications:", e);
      }
      try {
        await client.query("CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_type text NOT NULL, entity_id text NOT NULL, operation text NOT NULL, changed_by text NOT NULL DEFAULT 'System', previous_state text, new_state text, timestamp timestamp NOT NULL DEFAULT now())");
        console.log("Created audit_logs table");
      } catch (e) {
        console.error("Error creating audit_logs:", e);
      }


    // Now check if database is empty and requires seeding
    const userCountRes = await client.query("SELECT COUNT(*) FROM users");
    const userCount = parseInt((userCountRes.rows[0] as any).count, 10);
    
    if (userCount === 0) {
      console.log("Seeding database with highly realistic sample logistics data...");

      // 1. Seed default role permissions
      const defaultRoles = [
        { role: 'Admin', permissions: JSON.stringify(['read:shipments', 'write:shipments', 'read:inventory', 'write:inventory', 'manage:users', 'view:finance']) },
        { role: 'Operador', permissions: JSON.stringify(['read:shipments', 'write:shipments', 'read:inventory']) },
        { role: 'Ejecutivo', permissions: JSON.stringify(['read:shipments', 'read:inventory', 'view:finance']) },
        { role: 'Viewer', permissions: JSON.stringify(['read:shipments', 'read:inventory']) }
      ];
      for (const dr of defaultRoles) {
        await db.insert(schema.rolePermissions).values(dr).onConflictDoNothing();
      }

      // 2. Seed Users
      const passwordHash = bcrypt.hashSync('password', 10);
      const userList = [
        {
          id: crypto.randomUUID(),
          email: 'admin@example.com',
          password: passwordHash,
          displayName: 'Administrador de Red',
          firstName: 'Carlos',
          lastName: 'Mendoza',
          role: 'Admin',
          street: 'Av. El Golf 150',
          postalCode: '7550000',
          city: 'Santiago',
          province: 'Región Metropolitana',
          country: 'Chile',
          emailNotifications: 1,
          smsNotifications: 1,
          theme: 'light'
        },
        {
          id: crypto.randomUUID(),
          email: 'operador@example.com',
          password: passwordHash,
          displayName: 'Operador de Bodega',
          firstName: 'Sebastián',
          lastName: 'Gómez',
          role: 'Operador',
          street: 'Camino Melipilla 9800',
          postalCode: '9160000',
          city: 'Maipú',
          province: 'Región Metropolitana',
          country: 'Chile',
          emailNotifications: 1,
          smsNotifications: 0,
          theme: 'light'
        },
        {
          id: crypto.randomUUID(),
          email: 'ejecutivo@example.com',
          password: passwordHash,
          displayName: 'Ejecutivo de Cuentas',
          firstName: 'Francisca',
          lastName: 'Reyes',
          role: 'Ejecutivo',
          street: 'Apoquindo 3000',
          postalCode: '7550000',
          city: 'Las Condes',
          province: 'Región Metropolitana',
          country: 'Chile',
          emailNotifications: 1,
          smsNotifications: 0,
          theme: 'light'
        }
      ];

      for (const u of userList) {
        await db.insert(schema.users).values(u);
      }

      // 3. Seed Parties (Shippers, Consignees, Carriers)
      const partiesToInsert = [
        // Shippers
        { id: '11111111-1111-1111-1111-111111111111', category: 'Client', companyName: 'Global Shipping Corp', addressLine1: 'Av. Las Condes 12400', city: 'Santiago', country: 'Chile' },
        { id: '11111111-1111-1111-1111-222222222222', category: 'Client', companyName: 'Pacific Trading Ltd', addressLine1: 'Nanjing Road 88', city: 'Shanghai', country: 'China' },
        { id: '11111111-1111-1111-1111-333333333333', category: 'Client', companyName: 'Andes Agroindustrial', addressLine1: 'Belgrano 450', city: 'Mendoza', country: 'Argentina' },
        
        // Consignees
        { id: '22222222-2222-2222-2222-111111111111', category: 'Client', companyName: 'North America Importers', addressLine1: 'Biscayne Blvd 500', city: 'Miami', country: 'USA' },
        { id: '22222222-2222-2222-2222-222222222222', category: 'Client', companyName: 'Euro Distribution NV', addressLine1: 'Boompjes 40', city: 'Rotterdam', country: 'Netherlands' },
        { id: '22222222-2222-2222-2222-333333333333', category: 'Client', companyName: 'Valparaíso Retail', addressLine1: 'Av. Errázuriz 200', city: 'Valparaíso', country: 'Chile' },

        // Carriers
        { id: '33333333-3333-3333-3333-111111111111', category: 'Carrier', companyName: 'DHL Express Service', addressLine1: 'Airport Rd 15', city: 'Miami', country: 'USA' },
        { id: '33333333-3333-3333-3333-222222222222', category: 'Carrier', companyName: 'Maersk Line Ocean', addressLine1: 'Esplanaden 50', city: 'Copenhagen', country: 'Denmark' },
        { id: '33333333-3333-3333-3333-333333333333', category: 'Carrier', companyName: 'CMA CGM Shipping', addressLine1: 'Boulevard de Dunkerque 4', city: 'Marseille', country: 'France' },
        { id: '33333333-3333-3333-3333-444444444444', category: 'Carrier', companyName: 'LATAM Cargo', addressLine1: 'Americo Vespucio 901', city: 'Santiago', country: 'Chile' }
      ];

      for (const p of partiesToInsert) {
        await db.insert(schema.parties).values({
          id: p.id,
          category: p.category,
          companyName: p.companyName,
          addressLine1: p.addressLine1,
          city: p.city,
          country: p.country,
          name: p.companyName,
          type: p.category
        });
      }

      // 4. Seed Warehouses
      const warehousesToInsert = [
        { id: '44444444-4444-4444-4444-111111111111', code: 'WHS-STG-01', name: 'Santiago Port Warehouse', location: 'Camino Melipilla 9800, Maipú', capacity: 50000 },
        { id: '44444444-4444-4444-4444-222222222222', code: 'WHS-VAL-02', name: 'San Antonio Port Depot', location: 'Av. Barros Luco 1500, San Antonio', capacity: 30000 },
        { id: '44444444-4444-4444-4444-333333333333', code: 'WHS-AIR-03', name: 'Santiago Airport Hub', location: 'Av. Armando Cortínez, Pudahuel', capacity: 20000 }
      ];

      for (const w of warehousesToInsert) {
        await db.insert(schema.warehouses).values(w);
      }

      // 5. Seed Inventory
      const inventoryToInsert = [
        { id: crypto.randomUUID(), warehouseId: '44444444-4444-4444-4444-111111111111', sku: 'SKU-APP-001', description: 'Apple iPad Pro', quantity: '500', binLocation: 'A-12-3', batchNumber: 'BAT-2026-A', serialNumber: 'SN-00918' },
        { id: crypto.randomUUID(), warehouseId: '44444444-4444-4444-4444-111111111111', sku: 'SKU-BAT-002', description: 'Lithium Battery Packs', quantity: '1200', binLocation: 'B-04-1', batchNumber: 'BAT-2026-B', serialNumber: 'SN-10293' },
        { id: crypto.randomUUID(), warehouseId: '44444444-4444-4444-4444-222222222222', sku: 'SKU-SOL-003', description: 'Premium Solar Panels', quantity: '450', binLocation: 'C-08-2', batchNumber: 'BAT-2026-C', serialNumber: 'SN-39485' },
        { id: crypto.randomUUID(), warehouseId: '44444444-4444-4444-4444-333333333333', sku: 'SKU-MED-004', description: 'Therapeutic Vaccines', quantity: '1000', binLocation: 'REF-01-A', batchNumber: 'BAT-2026-D', serialNumber: 'SN-58291' },
        { id: crypto.randomUUID(), warehouseId: '44444444-4444-4444-4444-333333333333', sku: 'SKU-TXT-005', description: 'Eco Cotton Apparel', quantity: '2500', binLocation: 'D-15-4', batchNumber: 'BAT-2026-E', serialNumber: 'SN-92834' }
      ];

      for (const i of inventoryToInsert) {
        await db.insert(schema.inventory).values(i);
      }

      // 6. Seed Shipments covering Q2 and early Q3 2026
      const shipmentsToInsert = [
        {
          id: '55555555-5555-5555-5555-111111111111',
          referenceNumber: 'FFW-2026-101',
          trackingNumber: 'TRK-2026-9001',
          priority: 'High',
          type: 'Sea-FCL',
          status: 'Delivered',
          shipperId: '11111111-1111-1111-1111-111111111111',
          consigneeId: '22222222-2222-2222-2222-222222222222',
          carrierId: '33333333-3333-3333-3333-222222222222',
          originPort: 'Valparaiso, CL',
          destinationPort: 'Rotterdam, NL',
          etd: new Date('2026-04-05T08:00:00Z'),
          eta: new Date('2026-04-28T18:00:00Z'),
          atd: new Date('2026-04-05T10:00:00Z'),
          ata: new Date('2026-04-29T11:00:00Z'),
          hbl: 'HBL-VAL-ROT-001',
          mbl: 'MBL-MAE-VAL-ROT-001',
          freightCost: '4200.00',
          customsCost: '400.00',
          insuranceCost: '100.00',
          currency: 'USD',
          weight: '8500'
        },
        {
          id: '55555555-5555-5555-5555-222222222222',
          referenceNumber: 'FFW-2026-102',
          trackingNumber: 'TRK-2026-9002',
          priority: 'Normal',
          type: 'Air',
          status: 'Delivered',
          shipperId: '11111111-1111-1111-1111-222222222222',
          consigneeId: '22222222-2222-2222-2222-333333333333',
          carrierId: '33333333-3333-3333-3333-444444444444',
          originPort: 'Shanghai Pudong, CN',
          destinationPort: 'Santiago Pudahuel, CL',
          etd: new Date('2026-04-12T14:00:00Z'),
          eta: new Date('2026-04-14T22:00:00Z'),
          atd: new Date('2026-04-12T14:15:00Z'),
          ata: new Date('2026-04-15T01:30:00Z'),
          awb: 'AWB-LAT-SHG-STG-002',
          freightCost: '12500.00',
          customsCost: '1200.00',
          insuranceCost: '350.00',
          currency: 'USD',
          weight: '1200'
        },
        {
          id: '55555555-5555-5555-5555-333333333333',
          referenceNumber: 'FFW-2026-103',
          trackingNumber: 'TRK-2026-9003',
          priority: 'Normal',
          type: 'Sea-LCL',
          status: 'Delivered',
          shipperId: '11111111-1111-1111-1111-333333333333',
          consigneeId: '22222222-2222-2222-2222-111111111111',
          carrierId: '33333333-3333-3333-3333-333333333333',
          originPort: 'Buenos Aires, AR',
          destinationPort: 'Miami, USA',
          etd: new Date('2026-04-20T10:00:00Z'),
          eta: new Date('2026-05-15T15:00:00Z'),
          atd: new Date('2026-04-20T11:00:00Z'),
          ata: new Date('2026-05-15T09:00:00Z'),
          hbl: 'HBL-EZE-MIA-003',
          mbl: 'MBL-CMA-EZE-MIA-003',
          freightCost: '2200.00',
          customsCost: '250.00',
          insuranceCost: '50.00',
          currency: 'USD',
          weight: '3400'
        },
        {
          id: '55555555-5555-5555-5555-444444444444',
          referenceNumber: 'FFW-2026-104',
          trackingNumber: 'TRK-2026-9004',
          priority: 'High',
          type: 'Air',
          status: 'Delivered',
          shipperId: '11111111-1111-1111-1111-111111111111',
          consigneeId: '22222222-2222-2222-2222-333333333333',
          carrierId: '33333333-3333-3333-3333-111111111111',
          originPort: 'Frankfurt, DE',
          destinationPort: 'Santiago Pudahuel, CL',
          etd: new Date('2026-05-02T18:00:00Z'),
          eta: new Date('2026-05-04T12:00:00Z'),
          atd: new Date('2026-05-02T19:00:00Z'),
          ata: new Date('2026-05-04T11:45:00Z'),
          awb: 'AWB-DHL-FRA-STG-004',
          freightCost: '9800.00',
          customsCost: '850.00',
          insuranceCost: '200.00',
          currency: 'USD',
          weight: '950'
        },
        {
          id: '55555555-5555-5555-5555-555555555555',
          referenceNumber: 'FFW-2026-105',
          trackingNumber: 'TRK-2026-9005',
          priority: 'Normal',
          type: 'Sea-FCL',
          status: 'Delivered',
          shipperId: '11111111-1111-1111-1111-222222222222',
          consigneeId: '22222222-2222-2222-2222-333333333333',
          carrierId: '33333333-3333-3333-3333-222222222222',
          originPort: 'Shanghai, CN',
          destinationPort: 'Valparaiso, CL',
          etd: new Date('2026-05-10T12:00:00Z'),
          eta: new Date('2026-06-08T15:00:00Z'),
          atd: new Date('2026-05-10T13:00:00Z'),
          ata: new Date('2026-06-09T18:00:00Z'),
          hbl: 'HBL-SHA-VAL-005',
          mbl: 'MBL-MAE-SHA-VAL-005',
          freightCost: '6500.00',
          customsCost: '600.00',
          insuranceCost: '150.00',
          currency: 'USD',
          weight: '15000'
        },
        {
          id: '55555555-5555-5555-5555-666666666666',
          referenceNumber: 'FFW-2026-106',
          trackingNumber: 'TRK-2026-9006',
          priority: 'High',
          type: 'Road',
          status: 'Delivered',
          shipperId: '11111111-1111-1111-1111-333333333333',
          consigneeId: '22222222-2222-2222-2222-333333333333',
          carrierId: '33333333-3333-3333-3333-444444444444',
          originPort: 'Mendoza, AR',
          destinationPort: 'Santiago, CL',
          etd: new Date('2026-05-25T07:00:00Z'),
          eta: new Date('2026-05-27T18:00:00Z'),
          atd: new Date('2026-05-25T08:00:00Z'),
          ata: new Date('2026-05-27T17:30:00Z'),
          freightCost: '1500.00',
          customsCost: '150.00',
          insuranceCost: '30.00',
          currency: 'USD',
          weight: '6000'
        },
        {
          id: '55555555-5555-5555-5555-777777777777',
          referenceNumber: 'FFW-2026-107',
          trackingNumber: 'TRK-2026-9007',
          priority: 'Normal',
          type: 'Sea-FCL',
          status: 'Delivered',
          shipperId: '11111111-1111-1111-1111-111111111111',
          consigneeId: '22222222-2222-2222-2222-333333333333',
          carrierId: '33333333-3333-3333-3333-222222222222',
          originPort: 'Rotterdam, NL',
          destinationPort: 'Valparaiso, CL',
          etd: new Date('2026-06-01T10:00:00Z'),
          eta: new Date('2026-06-25T14:00:00Z'),
          atd: new Date('2026-06-01T12:00:00Z'),
          ata: new Date('2026-06-24T10:00:00Z'),
          hbl: 'HBL-ROT-VAL-007',
          mbl: 'MBL-MAE-ROT-VAL-007',
          freightCost: '5800.00',
          customsCost: '550.00',
          insuranceCost: '120.00',
          currency: 'USD',
          weight: '11000'
        },
        {
          id: '55555555-5555-5555-5555-888888888888',
          referenceNumber: 'FFW-2026-108',
          trackingNumber: 'TRK-2026-9008',
          priority: 'Normal',
          type: 'Air',
          status: 'Delivered',
          shipperId: '11111111-1111-1111-1111-222222222222',
          consigneeId: '22222222-2222-2222-2222-333333333333',
          carrierId: '33333333-3333-3333-3333-111111111111',
          originPort: 'Miami, USA',
          destinationPort: 'Santiago Pudahuel, CL',
          etd: new Date('2026-06-12T16:00:00Z'),
          eta: new Date('2026-06-14T21:00:00Z'),
          atd: new Date('2026-06-12T17:15:00Z'),
          ata: new Date('2026-06-14T23:30:00Z'),
          awb: 'AWB-DHL-MIA-STG-008',
          freightCost: '8200.00',
          customsCost: '750.00',
          insuranceCost: '180.00',
          currency: 'USD',
          weight: '1800'
        },
        {
          id: '55555555-5555-5555-5555-999999999999',
          referenceNumber: 'FFW-2026-109',
          trackingNumber: 'TRK-2026-9009',
          priority: 'High',
          type: 'Sea-LCL',
          status: 'InTransit',
          shipperId: '11111111-1111-1111-1111-222222222222',
          consigneeId: '22222222-2222-2222-2222-222222222222',
          carrierId: '33333333-3333-3333-3333-333333333333',
          originPort: 'Shanghai, CN',
          destinationPort: 'Rotterdam, NL',
          etd: new Date('2026-06-18T09:00:00Z'),
          eta: new Date('2026-07-20T17:00:00Z'),
          atd: new Date('2026-06-18T11:00:00Z'),
          hbl: 'HBL-SHA-ROT-009',
          mbl: 'MBL-CMA-SHA-ROT-009',
          freightCost: '3100.00',
          customsCost: '300.00',
          insuranceCost: '70.00',
          currency: 'USD',
          weight: '4200'
        },
        {
          id: '55555555-5555-5555-5555-aaaaaaaaaaaa',
          referenceNumber: 'FFW-2026-110',
          trackingNumber: 'TRK-2026-9010',
          priority: 'Normal',
          type: 'Air',
          status: 'InTransit',
          shipperId: '11111111-1111-1111-1111-111111111111',
          consigneeId: '22222222-2222-2222-2222-111111111111',
          carrierId: '33333333-3333-3333-3333-111111111111',
          originPort: 'Frankfurt, DE',
          destinationPort: 'Miami, USA',
          etd: new Date('2026-07-02T13:00:00Z'),
          eta: new Date('2026-07-04T19:00:00Z'),
          atd: new Date('2026-07-02T15:30:00Z'),
          awb: 'AWB-DHL-FRA-MIA-010',
          freightCost: '11500.00',
          customsCost: '950.00',
          insuranceCost: '220.00',
          currency: 'USD',
          weight: '1500'
        },
        {
          id: '55555555-5555-5555-5555-bbbbbbbbbbbb',
          referenceNumber: 'FFW-2026-111',
          trackingNumber: 'TRK-2026-9011',
          priority: 'High',
          type: 'Sea-FCL',
          status: 'Booked',
          shipperId: '11111111-1111-1111-1111-222222222222',
          consigneeId: '22222222-2222-2222-2222-333333333333',
          carrierId: '33333333-3333-3333-3333-222222222222',
          originPort: 'Shanghai, CN',
          destinationPort: 'San Antonio, CL',
          etd: new Date('2026-07-15T06:00:00Z'),
          eta: new Date('2026-08-10T12:00:00Z'),
          hbl: 'HBL-SHA-SNA-011',
          mbl: 'MBL-MAE-SHA-SNA-011',
          freightCost: '7200.00',
          customsCost: '700.00',
          insuranceCost: '160.00',
          currency: 'USD',
          weight: '18000'
        },
        {
          id: '55555555-5555-5555-5555-cccccccccccc',
          referenceNumber: 'FFW-2026-112',
          trackingNumber: 'TRK-2026-9012',
          priority: 'Normal',
          type: 'Air',
          status: 'Draft',
          shipperId: '11111111-1111-1111-1111-222222222222',
          consigneeId: '22222222-2222-2222-2222-333333333333',
          carrierId: '33333333-3333-3333-3333-111111111111',
          originPort: 'Miami, USA',
          destinationPort: 'Santiago Pudahuel, CL',
          etd: new Date('2026-07-20T11:00:00Z'),
          eta: new Date('2026-07-22T20:00:00Z'),
          awb: 'AWB-DHL-MIA-STG-012',
          freightCost: '4500.00',
          customsCost: '400.00',
          insuranceCost: '90.00',
          currency: 'USD',
          weight: '800'
        }
      ];

      for (const s of shipmentsToInsert) {
        const payload: any = { ...s };
        ['awb', 'hbl', 'mbl', 'ata', 'atd', 'trackingNumber', 'freightCost', 'customsCost', 'insuranceCost', 'weight'].forEach(k => {
          if (payload[k] === undefined) payload[k] = null;
        });
        await db.insert(schema.shipments).values(payload);
        
        // Seed an event for each shipment to show history
        await db.insert(schema.shipmentEvents).values({
          id: crypto.randomUUID(),
          shipmentId: s.id,
          eventType: 'Status Change',
          description: `Shipment created with status: ${s.status}`,
          newStatus: s.status,
          performedBy: 'System'
        });
      }

      // 7. Seed Rates
      const ratesToInsert = [
        { id: crypto.randomUUID(), carrierId: '33333333-3333-3333-3333-111111111111', origin: 'Miami, USA', destination: 'Santiago Pudahuel, CL', mode: 'Air', currency: 'USD', amount: '4.50', status: 'Approved' },
        { id: crypto.randomUUID(), carrierId: '33333333-3333-3333-3333-222222222222', origin: 'Shanghai, CN', destination: 'San Antonio, CL', mode: 'Sea-FCL', currency: 'USD', amount: '3500.00', status: 'Approved' },
        { id: crypto.randomUUID(), carrierId: '33333333-3333-3333-3333-444444444444', origin: 'Frankfurt, DE', destination: 'Santiago Pudahuel, CL', mode: 'Air', currency: 'USD', amount: '5.20', status: 'Proposed' }
      ];

      for (const r of ratesToInsert) {
        await db.insert(schema.rates).values(r);
      }

      // 8. Seed Invoices for some delivered shipments
      const invoicesToInsert = [
        { id: crypto.randomUUID(), invoiceNumber: 'INV-2026-001', shipmentId: '55555555-5555-5555-5555-111111111111', partyId: '22222222-2222-2222-2222-222222222222', amount: '4700.00', currency: 'USD', status: 'Paid', dueDate: new Date('2026-05-15T00:00:00Z') },
        { id: crypto.randomUUID(), invoiceNumber: 'INV-2026-002', shipmentId: '55555555-5555-5555-5555-222222222222', partyId: '22222222-2222-2222-2222-333333333333', amount: '14050.00', currency: 'USD', status: 'Paid', dueDate: new Date('2026-05-20T00:00:00Z') },
        { id: crypto.randomUUID(), invoiceNumber: 'INV-2026-003', shipmentId: '55555555-5555-5555-5555-444444444444', partyId: '22222222-2222-2222-2222-333333333333', amount: '10850.00', currency: 'USD', status: 'Pending', dueDate: new Date('2026-06-15T00:00:00Z') }
      ];

      for (const inv of invoicesToInsert) {
        await db.insert(schema.invoices).values(inv);
      }

      // 9. Seed Customs Declarations
      const customsToInsert = [
        { id: crypto.randomUUID(), declarationId: 'CUST-2026-101', shipmentRef: 'FFW-2026-101', shipmentId: '55555555-5555-5555-5555-111111111111', type: 'Import', status: 'Cleared', originCountry: 'Chile', destinationCountry: 'Netherlands', duties: '$400' },
        { id: crypto.randomUUID(), declarationId: 'CUST-2026-102', shipmentRef: 'FFW-2026-102', shipmentId: '55555555-5555-5555-5555-222222222222', type: 'Import', status: 'Cleared', originCountry: 'China', destinationCountry: 'Chile', duties: '$1,200' },
        { id: crypto.randomUUID(), declarationId: 'CUST-2026-103', shipmentRef: 'FFW-2026-109', shipmentId: '55555555-5555-5555-5555-999999999999', type: 'Import', status: 'Pending', originCountry: 'China', destinationCountry: 'Netherlands', duties: '$300' }
      ];

      for (const c of customsToInsert) {
        await db.insert(schema.customsDeclarations).values(c);
      }

      // 10. Seed Activity Logs
      const logsToInsert = [
        { id: crypto.randomUUID(), eventType: 'System Startup', description: 'Database seeded successfully with initial realistic logistics payload.', severity: 'info' },
        { id: crypto.randomUUID(), eventType: 'User Registration', description: 'Default account admin@example.com registered.', severity: 'info' },
        { id: crypto.randomUUID(), eventType: 'Inventory Sync', description: 'Warehouse levels mapped successfully.', severity: 'info' }
      ];

      for (const l of logsToInsert) {
        await db.insert(schema.activityLogs).values(l);
      }

      console.log("Database seeded successfully!");
    }
  } catch (err) {
    console.error("Error initializing database schema or seeding:", err);
  }
});
