# Prepedidos

Un prepedido registra una visita a un establecimiento. `pre_order` guarda el
establecimiento, dirección, observaciones, autor y fechas. `pre_order_product`
relaciona esa visita con cada producto y guarda `existing_quantity` (existente
en la tienda) y `requested_quantity` (cantidad a llevar). No crea una venta,
no registra pagos y no modifica el inventario del almacén.

## 1. Base de datos en Neon

Selecciona la misma base de datos y rama de Neon que usa el backend. Copia y
ejecuta completo `sql/2026-10-21-prepedidos-neon.sql` en su SQL Editor. El script
crea únicamente las dos tablas e índices nuevos dentro de una transacción.
Es compatible con volver a ejecutarlo y con la migración de TypeORM
`CreatePreOrders1792540800000`. No se ha ejecutado automáticamente en Neon.

Las claves foráneas usan los `bigint` de `person.id` y `product.id`. Se impide
borrar un usuario o producto que tenga prepedidos para conservar su historial.
Un mismo producto solo puede aparecer una vez por prepedido y ambas cantidades
tienen valor predeterminado cero y restricción de no negatividad.

Para comprobar la estructura después de ejecutar el script:

```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('pre_order', 'pre_order_product')
ORDER BY table_name, ordinal_position;
```

## 2. Backend

Compila y despliega el backend después del SQL. `synchronize` permanece en
`false`; el despliegue por sí solo no crea tablas. Si prefieres un flujo de
migraciones en otro entorno, usa la migración nueva con el mecanismo existente
del proyecto, revisando antes cualquier otra migración pendiente.

Operaciones GraphQL nuevas:

- `preOrderProducts`: todos los productos, en el orden del catálogo.
- `preOrders(filter)`: historial paginado; permite buscar por establecimiento,
  dirección o nombre del autor.
- `preOrder(id)`: detalle de una visita.
- `createPreOrder(input)` y `updatePreOrder(input)`: guardado transaccional.

Todas requieren una sesión válida y rol vendedor o administrador. El vendedor
solo puede listar, consultar y editar sus prepedidos. El administrador puede
consultar y editar todos. El autor se toma del usuario autenticado; el cliente
no puede enviarlo ni cambiarlo. Los alias `seller` y `admin` también se respetan.

Las cantidades aceptan cualquier entero entre 0 y 2147483647: los múltiplos de
seis son una ayuda de captura, no una restricción. `null` y campos omitidos se
guardan como cero. Al editar se envía la `version` leída; una edición simultánea
rechaza la versión antigua en lugar de sobrescribir la visita.

## 3. Frontend

Despliega el frontend apuntando al backend actualizado. La ruta compartida es
`/prepedidos`, con acceso en el header de ambos roles, menú móvil y menú del
administrador. Tiene formulario nuevo, búsqueda de productos, dos contadores
por producto, historial y edición. Las búsquedas conservan las cantidades de
todos los productos, aunque no estén visibles; se guardan también las filas en
cero. Los campos vacíos del formulario se convierten en cero antes de enviar.

La ruta está protegida por el proxy y por la interfaz, y tiene `noindex`. Los
permisos reales se comprueban de nuevo en el backend, incluso al acceder por ID.

## Verificación local aislada

Las pruebas de integración usan PostgreSQL real, inicio de sesión y JWT reales.
La base debe llamarse exactamente `monik_preorders_test` y estar en localhost;
el helper rechaza otros destinos para evitar que sus fixtures alcancen Neon.
El SQL nuevo se prueba desde el archivo destinado al SQL Editor.

```sh
PRE_ORDER_TEST_DATABASE_URL=postgresql://USUARIO@127.0.0.1:PUERTO/monik_preorders_test \
  npx jest --config test/jest-e2e.json --runInBand test/pre-orders.e2e-spec.ts
```

Se verifican ceros, cantidades manuales, permisos, autor, claves foráneas,
rechazo de entradas inválidas, concurrencia y rollback de cabecera y detalle.

## Error: `relation "pre_order" does not exist`

Este error indica que falta ejecutar el SQL en la base a la que se conecta el
backend. Crear las tablas en Neon no las crea también en PostgreSQL local, ni
al revés. Revisa el destino configurado en `DB_HOST` y `DB_NAME` del entorno
del backend y aplica el mismo script en ese destino. Mantén `synchronize: false`.

Puedes comprobarlo en la conexión correspondiente con:

```sql
SELECT current_database(), current_schema(),
       to_regclass('pre_order') AS pre_order,
       to_regclass('pre_order_product') AS pre_order_product;
```

Si alguna de las dos tablas devuelve `NULL`, falta aplicar el script en esa
base o está creado en otro esquema que no pertenece a su `search_path`.
Después de aplicarlo, reintenta guardar el formulario; no es necesario
reiniciar el backend para que PostgreSQL reconozca las tablas nuevas.
