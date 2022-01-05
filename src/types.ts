import { VercelRequest } from '@vercel/node';

export type RequestWithUser = VercelRequest & {
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