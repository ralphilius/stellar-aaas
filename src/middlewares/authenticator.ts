import { VercelRequest, VercelResponse } from '@vercel/node';
import { RequestWithUser } from '../types';
import { getToken } from '../utils/database';

const validate = async (req: RequestWithUser, res: VercelResponse) => {
  const { headers } = req;
  if (!headers["authorization"] || (headers["authorization"] && !headers["authorization"].startsWith("Bearer "))){    
    const err: any = new Error('Invalid or Missing API Key');
    err.code = 401
    throw err

  } else {
    const apiKey = headers["authorization"].split("Bearer ")[1];
    await getToken(apiKey).then(userId => {
      if (!userId){
        const err: any = new Error('Invalid API Key');
        err.code = 401;
        throw err
      }
      req.user = {
        id: userId
      };
    }).catch((e) => {
      e.code = 500;
      throw e;
    });
  }
}

export default validate;