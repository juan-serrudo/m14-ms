/**
 * Interfaz para eventos de dominio de usuarios
 * Estos eventos se consumen desde el topic 'user-events' de Kafka
 */
export interface UserEvent {
  type: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED';
  payload: {
    id: number;
    email: string;
    name?: string;
    status?: string;
  };
  occurredAt: string; // ISO date string
}

