import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserCacheService } from './user-cache.service';
import { ResponseDTO } from 'src/dto/response.dto';

@ApiTags('USER CACHE (Eventual Consistency)')
@Controller('user-cache')
export class UserCacheController {
  constructor(private readonly userCacheService: UserCacheService) {}

  @Get('/stats')
  @ApiOperation({
    summary: 'Obtener estadísticas del cache local de usuarios',
    description: 'Muestra el estado del cache local mantenido mediante eventos de Kafka. Demuestra eventual consistency.'
  })
  async getCacheStats(): Promise<ResponseDTO> {
    const stats = this.userCacheService.getCacheStats();
    const users = await this.userCacheService.getAllUsers();

    return {
      error: false,
      message: 'Estadísticas del cache local de usuarios (eventual consistency)',
      response: {
        stats,
        users,
        note: 'Este cache se actualiza mediante eventos de Kafka desde el microservicio users'
      },
      status: 200,
    };
  }

  @Get('/users')
  @ApiOperation({
    summary: 'Listar usuarios en cache local',
    description: 'Lista todos los usuarios conocidos en el cache local mantenido por eventos de Kafka'
  })
  async getCachedUsers(): Promise<ResponseDTO> {
    const users = await this.userCacheService.getAllUsers();

    return {
      error: false,
      message: 'Usuarios en cache local',
      response: users,
      status: 200,
    };
  }
}

