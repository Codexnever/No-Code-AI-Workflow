import { Client, Databases, Role, Permission, Account, ID, Query } from "appwrite";

if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || !process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID) {
  throw new Error('Appwrite environment variables are not properly configured');
}

const client = new Client();

// Configure the client
client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

// Initialize services
const databases = new Databases(client);
const account = new Account(client);

// Set default database ID for all database operations
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

export { 
  client, 
  databases, 
  account,
  Role, 
  Permission, 
  Account, 
  ID, 
  Query 
};