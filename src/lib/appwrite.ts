import { Client, Databases, Role, Permission, Account, ID, Query } from "appwrite";

const client = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1") // Replace with your Appwrite endpoint
  .setProject("67b4c03f000e42a0359c"); // Replace with your project ID

const databases = new Databases(client);
// const account = new Account(client);

export { client, databases, Role, Permission, Account, ID, Query };
