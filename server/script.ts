import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
dotenv.config();

// run psql script to show db
const { DB_HOST, DB_USER, DB_NAME, DB_PORT, DB_PASSWORD } = process.env;
execSync(`psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -p ${DB_PORT}`, {
  stdio: 'inherit',
  env: { ...process.env, PGPASSWORD: DB_PASSWORD }  
});