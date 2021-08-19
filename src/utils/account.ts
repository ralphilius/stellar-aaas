import * as crypto from "crypto";
import { getUser, getToken } from './database'
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('0123456789', 36);
const USERNAME_REGEX =  /^[A-Za-z0-9]{3,12}$/; //^[a-zA-Z0-9]+$/;

// Muxed account can only accept number, so we need to convert username string to a number.
export function usernameForId(username: string): string {
  //return username.split('').map(c => c.charCodeAt(0)).join('');
  return `${BigInt(parseInt(username.toLowerCase(), 36)).toString()}`;
}

export function validUsername(username: string){
  return USERNAME_REGEX.test(username.toLowerCase());
}

export function validPassword(password: string, hash: string, salt: string): boolean {
  return hash == crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
};

export function securePassword(password: string): { salt: string, hash: string } {
  let salt = crypto.randomBytes(16).toString('hex');
  let hash = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
  return { salt, hash };
}

export function accountForApiKey(apiKey: string) {
  const username = getToken(apiKey);
  if (!username) return null;

  return getUser(username);
}