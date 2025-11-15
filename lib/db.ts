import { createPool, Pool } from 'mysql2/promise';

const pool: Pool = createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT) || 3306,
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

export default pool;

