import { Sucursal } from '../entities/sucursal.entity';

export interface SucursalRepository {
  save(sucursal: Sucursal): Promise<Sucursal>;
  findById(id: string): Promise<Sucursal | null>;
  findByBancaId(bancaId: string): Promise<Sucursal[]>;
  findByCode(bancaId: string, code: string): Promise<Sucursal | null>;
  update(sucursal: Sucursal): Promise<Sucursal>;
  delete(id: string): Promise<void>;
}

export const SUCURSAL_REPOSITORY = Symbol('SucursalRepository');
