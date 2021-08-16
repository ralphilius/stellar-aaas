import { Request } from 'express';

export type RequestWithUser = Request & {
  user: {
    username: string
  }
}

export type User = {
  salt: string
  hash: string
  apiKey: string
  balance: string
}