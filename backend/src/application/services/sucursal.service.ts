import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Sucursal, TicketConfig } from '../../domain/entities/sucursal.entity';
import { SucursalRepository, SUCURSAL_REPOSITORY } from '../../domain/repositories/sucursal.repository';
import { CreateSucursalDto, UpdateSucursalDto, SucursalResponseDto } from '../dtos/sucursal.dto';

@Injectable()
export class SucursalService {
  constructor(
    @Inject(SUCURSAL_REPOSITORY)
    private readonly sucursalRepository: SucursalRepository,
  ) {}

  async createSucursal(dto: CreateSucursalDto): Promise<SucursalResponseDto> {
    // Check if sucursal with same code already exists for this banca
    const existing = await this.sucursalRepository.findByCode(dto.bancaId, dto.code);
    if (existing) {
      throw new ConflictException(`Sucursal with code ${dto.code} already exists for this banca`);
    }

    const sucursal = new Sucursal({
      bancaId: dto.bancaId,
      name: dto.name,
      code: dto.code,
      address: dto.address,
      city: dto.city,
      phone: dto.phone,
      operatorPrefix: dto.operatorPrefix,
      ticketConfig: dto.ticketConfig as TicketConfig,
    });

    const saved = await this.sucursalRepository.save(sucursal);
    return this.toResponseDto(saved);
  }

  async getSucursalById(id: string): Promise<SucursalResponseDto> {
    const sucursal = await this.sucursalRepository.findById(id);
    if (!sucursal) {
      throw new NotFoundException(`Sucursal with id ${id} not found`);
    }
    return this.toResponseDto(sucursal);
  }

  async getSucursalesByBancaId(bancaId: string): Promise<SucursalResponseDto[]> {
    const sucursales = await this.sucursalRepository.findByBancaId(bancaId);
    return sucursales.map(s => this.toResponseDto(s));
  }

  async updateSucursal(id: string, dto: UpdateSucursalDto): Promise<SucursalResponseDto> {
    const sucursal = await this.sucursalRepository.findById(id);
    if (!sucursal) {
      throw new NotFoundException(`Sucursal with id ${id} not found`);
    }

    if (dto.name || dto.address || dto.city || dto.phone) {
      sucursal.updateContactInfo(dto.address, dto.city, dto.phone);
    }

    if (dto.ticketConfig) {
      sucursal.updateTicketConfig(dto.ticketConfig as Partial<TicketConfig>);
    }

    const updated = await this.sucursalRepository.update(sucursal);
    return this.toResponseDto(updated);
  }

  async updateTicketConfig(id: string, config: Partial<TicketConfig>): Promise<SucursalResponseDto> {
    const sucursal = await this.sucursalRepository.findById(id);
    if (!sucursal) {
      throw new NotFoundException(`Sucursal with id ${id} not found`);
    }

    sucursal.updateTicketConfig(config);
    const updated = await this.sucursalRepository.update(sucursal);
    return this.toResponseDto(updated);
  }

  async deactivateSucursal(id: string): Promise<SucursalResponseDto> {
    const sucursal = await this.sucursalRepository.findById(id);
    if (!sucursal) {
      throw new NotFoundException(`Sucursal with id ${id} not found`);
    }

    sucursal.deactivate();
    const updated = await this.sucursalRepository.update(sucursal);
    return this.toResponseDto(updated);
  }

  async activateSucursal(id: string): Promise<SucursalResponseDto> {
    const sucursal = await this.sucursalRepository.findById(id);
    if (!sucursal) {
      throw new NotFoundException(`Sucursal with id ${id} not found`);
    }

    sucursal.activate();
    const updated = await this.sucursalRepository.update(sucursal);
    return this.toResponseDto(updated);
  }

  async deleteSucursal(id: string): Promise<void> {
    const sucursal = await this.sucursalRepository.findById(id);
    if (!sucursal) {
      throw new NotFoundException(`Sucursal with id ${id} not found`);
    }

    await this.sucursalRepository.delete(id);
  }

  private toResponseDto(sucursal: Sucursal): SucursalResponseDto {
    const json = sucursal.toJSON();
    return {
      id: json.id,
      bancaId: json.bancaId,
      name: json.name,
      code: json.code,
      address: json.address,
      city: json.city,
      phone: json.phone,
      operatorPrefix: json.operatorPrefix,
      isActive: json.isActive,
      ticketConfig: json.ticketConfig,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
    };
  }
}
