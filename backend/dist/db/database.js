import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://secureapp:secureapp@localhost:5432/secureapp',
});
export default pool;
//# sourceMappingURL=database.js.map