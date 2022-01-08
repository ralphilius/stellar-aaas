if(!process.env.DETA_PROJECT_KEY) throw new Error("DETA_PROJECT_KEY is not set");
const { Deta } = require("deta")
const deta = Deta(process.env.DETA_PROJECT_KEY)
const userDb = deta.Base("users");

// const Database = require("@replit/database");
// const db = new Database(process.env.CUSTOM_DB || null);

import { User } from '../types';
import { usernameForId } from './account';

export async function createUser(username: string, data: User) {
  const userId = usernameForId(username);
  //setToken(data.apiKey, username); // Replit Database is a key-value database without query capability, so this will help to validate API key later.
  
  return await userDb.put(data, userId);

  //return db.set(`user-${userId}`, data);
}

export async function updateUser(userId: string, data: any) {
  delete data.key;
  return await userDb.update(data, userId);
  // return db.set(`user-${userId}`, data)
}

export async function getUser(username: string): Promise<User> {
  const userId = usernameForId(username);
  return await getUserById(userId);
  //return db.get(`user-${userId}`);
}

export async function getUserById(userId: string | null | undefined): Promise<User>{
  return await userDb.get(userId);
  // return db.get(`user-${userId}`);
}

// export function setToken(apiKey: string, username: string){
//   const userId = usernameForId(username);
//   return db.set(`token-${apiKey}`, userId);
// }

export async function getToken(apiKey: string): Promise<string | null> {
  const {items, count} = await userDb.fetch({apiKey: apiKey});
  if(count < 1) return null;
  return items[0].key;
  // return db.get(`token-${apiKey}`);
}