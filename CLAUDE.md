# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev       # Run with hot-reload (watch mode)
npm run build           # Compile TypeScript
npm run start:prod      # Run compiled output

# Code quality
npm run lint            # ESLint with auto-fix
npm run format          # Prettier format

# Testing
npm test                # Run all unit tests
npm run test:watch      # Watch mode
npm run test:e2e        # End-to-end tests

# Database migrations
npm run migration:generate   # Generate migration from entity diff (outputs to src/migrations/Migration-<timestamp>.ts)
npm run migration:run        # Apply pending migrations to local DB
npm run migration:revert     # Revert last migration
```

## Environment Variables

Required in `.env`:

```
DB_HOST=
DB_PORT=5432
DB_USER=
DB_PASS=
DB_NAME=
JWT_SECRET=
JWT_EXPIRES_IN=
```

## Architecture

**Stack:** NestJS + TypeORM + PostgreSQL + GraphQL (code-first via `@nestjs/graphql` + Apollo)

**GraphQL schema** is auto-generated at `src/schema.gql` from decorators — never edit this file manually.

**`synchronize: false`** — the DB schema is never auto-synced. All schema changes must go through migrations.

### Module structure

Each domain module (`product`, `category`, `person`, `auth`) follows this pattern:
- `*.entity.ts` — TypeORM entity + GraphQL `@ObjectType()` (same class serves both roles)
- `*.resolver.ts` — GraphQL queries/mutations
- `*.service.ts` — Business logic, uses `Repository<Entity>`
- `dto/create-*.input.ts` / `dto/update-*.input.ts` — GraphQL `@InputType()`
- `*.module.ts` — registers entities via `TypeOrmModule.forFeature([...])`

**Important:** every entity used in a relation must be listed in `TypeOrmModule.forFeature([...])` inside its module, otherwise TypeORM throws a metadata error at startup.

### Authentication

JWT-based auth via `passport-jwt`. `JwtAuthGuard` is adapted for GraphQL context (`GqlExecutionContext`) in `src/auth/guards/jwt-auth.guard.ts`. Token blacklist is in-memory (lost on restart). Passwords are hashed with bcrypt.

### Migrations workflow

1. Update entity files in `src/**/*.entity.ts`
2. Run `npm run migration:generate` — TypeORM diffs entities against the current DB and generates a migration file
3. Review the generated file in `src/migrations/`
4. Run `npm run migration:run` to apply

For changes that TypeORM can't auto-generate (check constraints, custom SQL), write the migration manually in `src/migrations/<timestamp>-<Name>.ts` implementing `MigrationInterface` with `up()` and `down()` methods.

`src/data-source.ts` is the standalone DataSource used by the TypeORM CLI (separate from the NestJS app's `TypeOrmModule.forRootAsync`).
