# Sucursal (Branch Office) System Documentation

## Overview

The Sucursal system enables multi-branch operations for lottery bancas in the Dominican Republic. Each banca can operate multiple independent branches (sucursales) with their own ticket configurations, designs, and tracking systems.

This reflects real-world operations where bancas like Loteka, La Primera, and Loto Real have multiple physical locations, each printing tickets with their own branding and operator information.

## Database Schema

### `sucursales` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `banca_id` | UUID | Reference to parent banca |
| `name` | VARCHAR(100) | Branch name (e.g., "ORTIZ", "CANDELIER") |
| `code` | VARCHAR(50) | Unique branch code within banca |
| `address` | VARCHAR(255) | Physical address |
| `city` | VARCHAR(100) | City location |
| `phone` | VARCHAR(50) | Contact phone |
| `operator_prefix` | VARCHAR(20) | Prefix for operator IDs |
| `is_active` | BOOLEAN | Active status |
| `ticket_config` | JSONB | Ticket configuration (see below) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### Ticket Configuration (JSONB)

```json
{
  "headerLogo": "https://example.com/logo.png",
  "footerText": "Gracias por su preferencia",
  "showBarcode": true,
  "showQR": false,
  "validityDays": 60,
  "customFields": {
    "field1": "value1"
  }
}
```

### Enhanced `plays` Table Fields

New fields added to track complete ticket information:

| Column | Type | Description |
|--------|------|-------------|
| `sucursal_id` | UUID | Reference to branch that processed the play |
| `sorteo_number` | VARCHAR(50) | Draw number (e.g., "#18331") |
| `sorteo_time` | VARCHAR(20) | Draw time (e.g., "1:00 PM") |
| `sorteo_name` | VARCHAR(100) | Draw/lottery name |
| `barcode` | VARCHAR(100) | Ticket barcode for scanning |
| `valid_until` | DATE | Expiration date (typically 60 days) |
| `operator_user_id` | VARCHAR(50) | Operator who processed the ticket |
| `modality` | VARCHAR(20) | Game modality |
| `receipt_printed_at` | TIMESTAMP | When receipt was printed |

## API Endpoints

### Create Branch Office

```http
POST /api/v1/bancas/:bancaId/sucursales
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Sucursal ORTIZ",
  "code": "ORTIZ-001",
  "address": "Calle Principal #123",
  "city": "Santo Domingo",
  "phone": "809-555-0123",
  "operatorPrefix": "OP",
  "ticketConfig": {
    "showBarcode": true,
    "showQR": false,
    "validityDays": 60,
    "footerText": "Válido por 60 días"
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "bancaId": "uuid",
  "name": "Sucursal ORTIZ",
  "code": "ORTIZ-001",
  "address": "Calle Principal #123",
  "city": "Santo Domingo",
  "phone": "809-555-0123",
  "operatorPrefix": "OP",
  "isActive": true,
  "ticketConfig": {
    "showBarcode": true,
    "showQR": false,
    "validityDays": 60,
    "footerText": "Válido por 60 días"
  },
  "createdAt": "2024-01-03T12:00:00Z",
  "updatedAt": "2024-01-03T12:00:00Z"
}
```

### List Branch Offices by Banca

```http
GET /api/v1/bancas/:bancaId/sucursales
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "bancaId": "uuid",
    "name": "Sucursal ORTIZ",
    "code": "ORTIZ-001",
    "isActive": true,
    ...
  }
]
```

### Get Branch Office Details

```http
GET /api/v1/sucursales/:id
Authorization: Bearer <jwt_token>
```

### Update Branch Office

```http
PATCH /api/v1/sucursales/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "address": "Nueva Calle #456",
  "city": "Santiago",
  "phone": "809-555-9999"
}
```

### Update Ticket Configuration

```http
PATCH /api/v1/sucursales/:id/ticket-config
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "validityDays": 90,
  "showQR": true,
  "footerText": "Nuevo texto"
}
```

### Activate Branch Office

```http
PATCH /api/v1/sucursales/:id/activate
Authorization: Bearer <jwt_token>
```

### Deactivate Branch Office

```http
PATCH /api/v1/sucursales/:id/deactivate
Authorization: Bearer <jwt_token>
```

### Delete Branch Office

```http
DELETE /api/v1/sucursales/:id
Authorization: Bearer <jwt_token>
```

## Creating a Play with Sucursal Information

When creating a play, you can now include detailed ticket information:

```http
POST /api/v1/plays
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "requestId": "uuid",
  "userId": "uuid",
  "lotteryId": "loteka",
  "numbers": ["03", "07", "12"],
  "betType": "quiniela",
  "amount": 50,
  "currency": "DOP",
  "payment": {
    "method": "wallet"
  },
  "bancaId": "uuid",
  "sucursalId": "uuid",
  "sorteoNumber": "#18331",
  "sorteoTime": "1:00 PM",
  "sorteoName": "Loto Real Día",
  "modality": "Quiniela",
  "operatorUserId": "OP020611062"
}
```

## Real-World Usage Example

### Scenario: Loteka Banca with Multiple Branches

1. **Create Banca** (already done in your system)
   ```
   Loteka (bancaId: abc-123)
   ```

2. **Create Branches**
   ```
   POST /api/v1/bancas/abc-123/sucursales
   
   Branch 1: ORTIZ (code: ORTIZ-001)
   Branch 2: MEGACHANCE (code: MEGA-001)
   Branch 3: ESPERANZA (code: ESP-001)
   ```

3. **Configure Each Branch**
   ```
   PATCH /api/v1/sucursales/{ortiz-id}/ticket-config
   {
     "headerLogo": "https://cdn.loteka.com/ortiz-logo.png",
     "footerText": "Sucursal ORTIZ - Gracias por su preferencia",
     "validityDays": 60
   }
   ```

4. **Process Play at Specific Branch**
   ```
   POST /api/v1/plays
   {
     ...
     "bancaId": "abc-123",
     "sucursalId": "ortiz-id",
     "sorteoNumber": "#18331",
     "sorteoTime": "1:00 PM",
     "operatorUserId": "ORTIZ-020611062"
   }
   ```

5. **Query Plays by Branch**
   ```
   GET /api/v1/plays?sucursalId=ortiz-id
   ```

## Benefits

✅ **Reflects Real Operations**: Matches how lottery bancas actually operate in Dominican Republic  
✅ **Independent Configurations**: Each branch maintains its own ticket design and settings  
✅ **Complete Auditing**: Track which operator at which branch processed each ticket  
✅ **Regulatory Compliance**: Full traceability required by lottery regulations  
✅ **Barcode Support**: Enable ticket scanning and validation  
✅ **Validity Tracking**: Automatic expiration date calculation  

## Migration

To apply the database changes:

```bash
# Using psql
psql -U lotolink -d lotolink_db -f backend/database/migrations/002_add_sucursales.sql

# Or using TypeORM (if configured)
npm run migration:run
```

## Testing

Unit tests are provided in:
- `backend/test/unit/sucursal.entity.spec.ts` - Sucursal entity tests
- `backend/test/unit/play.entity.spec.ts` - Play entity tests with new fields

Run tests:
```bash
cd backend
npm test
```

## Security Considerations

- All endpoints require JWT authentication
- Branch offices can only be created/modified by authorized users
- Cascade deletion: Deleting a banca will delete all its branch offices
- Soft delete recommended for audit trail (deactivate instead of delete)

## Future Enhancements

- QR code generation for tickets
- Digital signature verification
- Real-time inventory tracking per branch
- Performance metrics per branch office
- Operator performance tracking
