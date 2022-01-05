import type { VercelResponse } from '@vercel/node';
import { RequestWithUser } from '../types';

const handleErrors = (fn: (req: RequestWithUser, res: VercelResponse) => void) => async (req: RequestWithUser, res: VercelResponse) => {
  try {
    return await fn(req, res)
  } catch (err: any) {
    console.log(err)
    res.status(err.code).send(err.message);
  }
}

export default handleErrors;