import pkg from 'pg'
const { Pool, types } = pkg

// Return DATE columns (OID 1082) as plain 'YYYY-MM-DD' strings instead of
// timezone-shifted JS Date objects (which drift the day across timezones).
types.setTypeParser(1082, (value) => value)

const pool = new Pool({
    connectionString:
        process.env.DATABASE_URL ||
            'postgres://secureapp:secureapp@localhost:5432/secureapp',
})

export default pool
