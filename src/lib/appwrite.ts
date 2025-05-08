import { Client, Databases, Role, Permission, Account, ID, Query } from "appwrite";

const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '67b4c03f000e42a0359c';

const client = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const account = new Account(client);

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