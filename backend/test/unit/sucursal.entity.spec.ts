import { Sucursal } from '../../src/domain/entities/sucursal.entity';

describe('Sucursal Entity', () => {
  it('should create a sucursal with default values', () => {
    const sucursal = new Sucursal({
      bancaId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sucursal ORTIZ',
      code: 'ORTIZ-001',
    });

    expect(sucursal.id).toBeDefined();
    expect(sucursal.bancaId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(sucursal.name).toBe('Sucursal ORTIZ');
    expect(sucursal.code).toBe('ORTIZ-001');
    expect(sucursal.isActive).toBe(true);
    expect(sucursal.ticketConfig.showBarcode).toBe(true);
    expect(sucursal.ticketConfig.showQR).toBe(false);
    expect(sucursal.ticketConfig.validityDays).toBe(60);
  });

  it('should activate and deactivate sucursal', () => {
    const sucursal = new Sucursal({
      bancaId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sucursal Test',
      code: 'TEST-001',
      isActive: false,
    });

    expect(sucursal.isActive).toBe(false);

    sucursal.activate();
    expect(sucursal.isActive).toBe(true);

    sucursal.deactivate();
    expect(sucursal.isActive).toBe(false);
  });

  it('should update ticket config', () => {
    const sucursal = new Sucursal({
      bancaId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sucursal Test',
      code: 'TEST-001',
    });

    sucursal.updateTicketConfig({
      validityDays: 90,
      showQR: true,
    });

    expect(sucursal.ticketConfig.validityDays).toBe(90);
    expect(sucursal.ticketConfig.showQR).toBe(true);
    expect(sucursal.ticketConfig.showBarcode).toBe(true);
  });

  it('should update contact info', () => {
    const sucursal = new Sucursal({
      bancaId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sucursal Test',
      code: 'TEST-001',
    });

    sucursal.updateContactInfo('Calle Principal #123', 'Santo Domingo', '809-555-0123');

    expect(sucursal.address).toBe('Calle Principal #123');
    expect(sucursal.city).toBe('Santo Domingo');
    expect(sucursal.phone).toBe('809-555-0123');
  });

  it('should serialize to JSON correctly', () => {
    const sucursal = new Sucursal({
      bancaId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Sucursal ORTIZ',
      code: 'ORTIZ-001',
      address: 'Calle Principal #123',
      city: 'Santo Domingo',
      phone: '809-555-0123',
    });

    const json = sucursal.toJSON();

    expect(json).toHaveProperty('id');
    expect(json).toHaveProperty('bancaId', '123e4567-e89b-12d3-a456-426614174000');
    expect(json).toHaveProperty('name', 'Sucursal ORTIZ');
    expect(json).toHaveProperty('code', 'ORTIZ-001');
    expect(json).toHaveProperty('address', 'Calle Principal #123');
    expect(json).toHaveProperty('city', 'Santo Domingo');
    expect(json).toHaveProperty('phone', '809-555-0123');
    expect(json).toHaveProperty('isActive', true);
    expect(json).toHaveProperty('ticketConfig');
    expect(json).toHaveProperty('createdAt');
    expect(json).toHaveProperty('updatedAt');
  });
});
