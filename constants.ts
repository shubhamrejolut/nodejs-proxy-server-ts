import * as dotenv from 'dotenv'
dotenv.config()

export const PROXY_HOST= process.env.PROXY_HOST
export const URL_REGEX = /(http(s)?:)\/\/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
export const MONGODB_URI=process.env.MONGODB_URI
export const ROLLBAR_TOKEN= process.env.ROLLBAR_TOKEN