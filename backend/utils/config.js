const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const STORE_TABLE = process.env.STORE_TABLE || "storedata";

module.exports = { JWT_SECRET, STORE_TABLE };