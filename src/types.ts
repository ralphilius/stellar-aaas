import { VercelRequest } from '@vercel/node';

export type RequestWithUser = VercelRequest & {
  user: {
    id: string
    username?: string
  }
}

export type User = {
  key: string
  salt: string
  hash: string
  apiKey: string
  balance: string
}