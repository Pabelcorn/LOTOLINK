import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sucursal, TicketConfig } from '../../../domain/entities/sucursal.entity';
import { SucursalRepository } from '../../../domain/repositories/sucursal.repository';
import { SucursalEntity } from '../entities/sucursal.db-entity';

@Injectable()
export class TypeOrmSucursalRepository implements SucursalRepository {
  constructor(
    @InjectRepository(SucursalEntity)
    private readonly repository: Repository<SucursalEntity>,
  ) {}

  async save(sucursal: Sucursal): Promise<Sucursal> {
    const entity = this.toEntity(sucursal);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Sucursal | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByBancaId(bancaId: string): Promise<Sucursal[]> {
    const entities = await this.repository.find({
      where: { bancaId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.toDomain(e));
  }

  async findByCode(bancaId: string, code: string): Promise<Sucursal | null> {
    const entity = await this.repository.findOne({ 
      where: { bancaId, code } 
    });
    return entity ? this.toDomain(entity) : null;
  }

  async update(sucursal: Sucursal): Promise<Sucursal> {
    const entity = this.toEntity(sucursal);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toEntity(sucursal: Sucursal): SucursalEntity {
    const entity = new SucursalEntity();
    entity.id = sucursal.id;
    entity.bancaId = sucursal.bancaId;
    entity.name = sucursal.name;
    entity.code = sucursal.code;
    entity.address = sucursal.address;
    entity.city = sucursal.city;
    entity.phone = sucursal.phone;
    entity.operatorPrefix = sucursal.operatorPrefix;
    entity.isActive = sucursal.isActive;
    entity.ticketConfig = sucursal.ticketConfig;
    entity.createdAt = sucursal.createdAt;
    entity.updatedAt = sucursal.updatedAt;
    return entity;
  }

  private toDomain(entity: SucursalEntity): Sucursal {
    return new Sucursal({
      id: entity.id,
      bancaId: entity.bancaId,
      name: entity.name,
      code: entity.code,
      address: entity.address,
      city: entity.city,
      phone: entity.phone,
      operatorPrefix: entity.operatorPrefix,
      isActive: entity.isActive,
      ticketConfig: entity.ticketConfig as TicketConfig,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
