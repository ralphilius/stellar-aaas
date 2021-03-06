const Database = require("@replit/database");
import { User } from '../types';
import { usernameForId } from './account';
const db = new Database(process.env.CUSTOM_DB || null);

export async function createUser(username: string, data: User) {
  const userId = usernameForId(username);
  setToken(data.apiKey, username); // Replit Database is a key-value database without query capability, so this will help to validate API key later.
  return db.set(`user-${userId}`, data);
}

export async function updateUser(userId: string, data: User) {
  return db.set(`user-${userId}`, data)
}

export async function getUser(username: string) {
  const userId = usernameForId(username);
  return db.get(`user-${userId}`);
}

export async function getUserById(userId: string): Promise<User>{
  return db.get(`user-${userId}`);
}

export function setToken(apiKey: string, username: string){
  const userId = usernameForId(username);
  return db.set(`token-${apiKey}`, userId);
}

export function getToken(apiKey: string){
  return db.get(`token-${apiKey}`);
}