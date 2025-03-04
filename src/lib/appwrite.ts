// src/lib/appwrite.ts
import { Client, Databases, Role, Permission, Account, ID, Query } from "appwrite";

const client = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject("67b4c03f000e42a0359c");

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