export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: string;
  warehouseId: string;
  sku: string;
  description: string | null;
  quantity: string;
  binLocation: string | null;
  batchNumber: string | null;
  serialNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  type: "IN" | "OUT";
  quantity: string;
  reference: string | null;
  shipmentId: string | null;
  createdAt: string;
}
