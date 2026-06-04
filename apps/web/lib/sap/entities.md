# SAP B1 Service Layer — Entidades verificadas contra DEMO_VK (2026-06-03)

## Endpoints y campos clave confirmados

### Warehouses (OWHS)
- `GET /Warehouses`, `GET /Warehouses('WarehouseCode')`
- Clave: `WarehouseCode` (string)
- Campos: `WarehouseCode`, `WarehouseName`, `Nettable` (tYES/tNO), `Inactive` (tYES/tNO), `DropShip` (tYES/tNO)

### BatchNumberDetails (OIBT)
- `GET /BatchNumberDetails`, `GET /BatchNumberDetails(DocEntry)`
- Clave: `DocEntry` (integer)
- Campos: `DocEntry`, `ItemCode`, `ItemDescription`, `Status` (bdsStatus_Released | bdsStatus_NotAccessible | bdsStatus_Locked), `Batch`, `AdmissionDate`, `ManufacturingDate`, `ExpirationDate`
- Soporta `$filter=ItemCode eq 'B10000'` ✅

### Items — sub-colección stock por depósito
- `GET /Items('ItemCode')/ItemWarehouseInfoCollection`
- Campos: `WarehouseCode`, `InStock`, `Committed`, `Ordered`

### Orders (ORDR — Órdenes de Venta)
- `GET /Orders`, `GET /Orders(DocEntry)`
- Clave: `DocEntry` (integer); `DocNum` es el número visible para el usuario
- Campos: `DocEntry`, `DocNum`, `DocDate`, `DocDueDate`, `CardCode`, `CardName`, `DocTotal`, `DocCurrency`, `DocumentStatus` (bost_Open | bost_Close), `Comments`, `SalesPersonCode`

### PurchaseOrders (OPOR — Órdenes de Compra)
- `GET /PurchaseOrders`, `GET /PurchaseOrders(DocEntry)`
- Mismos campos que Orders (sin SalesPersonCode)

### Invoices (OINV — Facturas de Clientes)
- `GET /Invoices`, `GET /Invoices(DocEntry)`
- Mismos campos que Orders + `PaidToDate`

### PurchaseInvoices (OPCH — Facturas de Proveedores)
- `GET /PurchaseInvoices`, `GET /PurchaseInvoices(DocEntry)`
- Mismos campos que Invoices

## Notas OData
- DocumentStatus filter: `$filter=DocumentStatus eq 'bost_Open'` ✅ (verified)
- SAP SL usa OData v3 (respuesta con `odata.metadata`, no `@odata.context`)
- `$top` / `$skip` / `$filter` / `$select` / `$orderby` soportados en todos los listados
- Single record por clave entera: `GET /Orders(1)` — sin comillas
- Single record por clave string: `GET /Warehouses('01')` — con comillas simples
