import { knexConfig } from './knexConfig'
import knex from 'knex'

export const db = knex(knexConfig)
