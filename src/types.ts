import { Request } from 'express';

export type RequestWithUser = Request & {
  user: {
    id: string
    username?: string
  }
}

export type User = {
  salt: string
  hash: string
  apiKey: string
  balance: string
}