// Migration script: uploads base64 images from DB to Cloudinary and updates DB with URLs
// Run: node scripts/migrate-images-to-cloudinary.js

const { Client } = require('pg');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'blasecato',
  api_key: '615621917627821',
  api_secret: 'd6LopXIu558_dsCd-Jd1Gfi6uYA',
});

const DB_CONFIGS = [
  {
    label: 'LOCAL',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'monikdb',
    ssl: false,
  },
  {
    label: 'PRODUCTION (Neon)',
    host: 'ep-royal-salad-am818nzw-pooler.c-5.us-east-1.aws.neon.tech',
    port: 5432,
    user: 'neondb_owner',
    password: 'npg_giPaOhWMkD35',
    database: 'neondb',
    ssl: { rejectUnauthorized: false },
  },
];

async function uploadBase64ToCloudinary(base64DataUri, productId, imageIndex) {
  const result = await cloudinary.uploader.upload(base64DataUri, {
    folder: 'products',
    public_id: `product_${productId}_img_${imageIndex}`,
    overwrite: true,
  });
  return result.secure_url;
}

async function migrateDB(config) {
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl,
  });

  await client.connect();
  console.log(`\n=== ${config.label} ===`);

  const { rows } = await client.query(
    `SELECT id, name, images FROM product WHERE images IS NOT NULL AND images::text LIKE '%data:%'`
  );

  console.log(`Productos con base64: ${rows.length}`);

  for (const row of rows) {
    const images = row.images;
    const newUrls = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img || !img.startsWith('data:')) {
        newUrls.push(img);
        continue;
      }
      try {
        process.stdout.write(`  [${row.id}] ${row.name} - imagen ${i + 1}/${images.length}... `);
        const url = await uploadBase64ToCloudinary(img, row.id, i);
        newUrls.push(url);
        console.log('✓');
      } catch (err) {
        console.log(`✗ ERROR: ${err.message}`);
        newUrls.push(null);
      }
    }

    const validUrls = newUrls.filter(Boolean);
    await client.query(
      `UPDATE product SET images = $1 WHERE id = $2`,
      [JSON.stringify(validUrls), row.id]
    );
  }

  await client.end();
  console.log(`${config.label} completado.`);
}

async function main() {
  for (const config of DB_CONFIGS) {
    await migrateDB(config);
  }
  console.log('\nMigración completa.');
}

main().catch(console.error);
