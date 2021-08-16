import { Request, Response, NextFunction } from 'express';

export default function validate(req: Request, res: Response, next: NextFunction) {
  const { headers } = req;
  if(!headers['content-type'] || (headers['content-type'] != 'application/json')) return res.status(400).end();

  next();
}