import { Client, Databases, Role, Permission, Account, ID, Query } from "appwrite";

const client = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID);

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