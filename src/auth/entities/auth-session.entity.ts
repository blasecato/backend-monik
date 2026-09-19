import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Person } from '../../person/entities/person.entity';

/**
 * Sesión activa. Los access tokens no expiran, así que la validez la decide
 * esta tabla: si la fila del `jti` no existe, el token no sirve.
 * El logout borra la fila (allowlist, no denylist: si la tabla se pierde,
 * todos quedan deslogueados en vez de quedar tokens revocados vivos).
 */
@Entity('auth_sessions')
export class AuthSession {
  /** Claim `jti` del access token. */
  @PrimaryColumn({ type: 'uuid' })
  jti: string;

  @Column({ name: 'person_id', type: 'bigint' })
  personId: number;

  @ManyToOne(() => Person, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
