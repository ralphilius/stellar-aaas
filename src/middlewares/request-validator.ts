import type { VercelRequest, VercelResponse } from '@vercel/node';

const validate = async (req: VercelRequest, res: VercelResponse) => {
  const { username, password } = req.body;

  if (!username || !password){
    const err: any = new Error('Invalid request body');
    err.code = 400
    throw err
  }
}

export default validate;