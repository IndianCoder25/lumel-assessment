import { Knex } from 'knex'
import dotenv from 'dotenv'

dotenv.config()

export const knexConfig: Knex.Config = {
    client: 'mysql2',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT),
        pool: {
            min: 2,
            max: 10
        }
    }
}
