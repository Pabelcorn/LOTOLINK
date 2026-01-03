import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SucursalService } from '../../../application/services/sucursal.service';
import { CreateSucursalDto, UpdateSucursalDto, SucursalResponseDto } from '../../../application/dtos/sucursal.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TicketConfig } from '../../../domain/entities/sucursal.entity';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class SucursalesController {
  constructor(private readonly sucursalService: SucursalService) {}

  @Post('bancas/:bancaId/sucursales')
  @HttpCode(HttpStatus.CREATED)
  async createSucursal(
    @Param('bancaId') bancaId: string,
    @Body() createDto: CreateSucursalDto,
  ): Promise<SucursalResponseDto> {
    createDto.bancaId = bancaId;
    return this.sucursalService.createSucursal(createDto);
  }

  @Get('bancas/:bancaId/sucursales')
  async getSucursalesByBanca(
    @Param('bancaId') bancaId: string,
  ): Promise<SucursalResponseDto[]> {
    return this.sucursalService.getSucursalesByBancaId(bancaId);
  }

  @Get('sucursales/:id')
  async getSucursal(@Param('id') id: string): Promise<SucursalResponseDto> {
    return this.sucursalService.getSucursalById(id);
  }

  @Patch('sucursales/:id')
  async updateSucursal(
    @Param('id') id: string,
    @Body() updateDto: UpdateSucursalDto,
  ): Promise<SucursalResponseDto> {
    return this.sucursalService.updateSucursal(id, updateDto);
  }

  @Patch('sucursales/:id/ticket-config')
  async updateTicketConfig(
    @Param('id') id: string,
    @Body() config: Partial<TicketConfig>,
  ): Promise<SucursalResponseDto> {
    return this.sucursalService.updateTicketConfig(id, config);
  }

  @Patch('sucursales/:id/activate')
  async activateSucursal(@Param('id') id: string): Promise<SucursalResponseDto> {
    return this.sucursalService.activateSucursal(id);
  }

  @Patch('sucursales/:id/deactivate')
  async deactivateSucursal(@Param('id') id: string): Promise<SucursalResponseDto> {
    return this.sucursalService.deactivateSucursal(id);
  }

  @Delete('sucursales/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSucursal(@Param('id') id: string): Promise<void> {
    return this.sucursalService.deleteSucursal(id);
  }
}
