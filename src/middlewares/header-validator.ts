import type { VercelRequest, VercelResponse } from '@vercel/node';

const validate = async (req: VercelRequest, res: VercelResponse) => {
  const { headers } = req;
  if(!headers['content-type'] || (headers['content-type'] != 'application/json')){
    const err: any = new Error('Invalid content-type');
    err.code = 400
    throw err
  }
}

export default validate;