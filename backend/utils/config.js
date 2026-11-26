require('dotenv').config({ quiet: true });
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 random characters');
if (process.env.DB_PASSWORD === undefined) throw new Error('DB_PASSWORD must be explicitly configured (empty allowed for local development)');
const STORE_TABLE = "storedata";

module.exports = { JWT_SECRET, STORE_TABLE };
