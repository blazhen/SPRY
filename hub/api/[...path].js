// Vercel function: every /api/<name> route (all methods the handlers have). The path decides the handler (see _hub.js).
import { dispatch } from './_hub.js'

export const GET = (request) => dispatch(request)
export const POST = (request) => dispatch(request)
export const PUT = (request) => dispatch(request)
export const DELETE = (request) => dispatch(request)
