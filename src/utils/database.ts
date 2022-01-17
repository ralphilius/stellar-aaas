if(!process.env.DETA_PROJECT_KEY) throw new Error("DETA_PROJECT_KEY is not set");
const { Deta } = require("deta")
const deta = Deta(process.env.DETA_PROJECT_KEY)
const userDb = deta.Base("users");
const txDb = deta.Base("payments");
// const Database = require("@replit/database");
// const db = new Database(process.env.CUSTOM_DB || null);

import { User } from '../types';
import { usernameForId } from './account';

export async function createUser(username: string, data: User) {
  const userId = usernameForId(username);  
  return await userDb.put(data, userId);
}

export async function updateUser(userId: string, data: any) {
  delete data.key;
  return await userDb.update(data, userId);
}

export async function getUser(username: string): Promise<User | null> {
  const userId = usernameForId(username);
  return await getUserById(userId);
}

export async function getUserById(userId: string | null | undefined): Promise<User | null>{
  try {
    return await userDb.get(userId);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getLastPayments(query?: any){
  return await txDb.fetch(query, {limit: 100});
}

export async function createPayment(data: any, id: string | null | undefined){
  return await txDb.put(data, id);
}

export async function getToken(apiKey: string): Promise<string | null> {
  const {items, count} = await userDb.fetch({apiKey: apiKey});
  if(count < 1) return null;
  return items[0].key;
}