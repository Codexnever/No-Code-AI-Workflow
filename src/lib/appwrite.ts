import { Client, Databases } from "appwrite";

const client = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1") // Replace with your Appwrite endpoint
  .setProject("67b4c03f000e42a0359c"); // Replace with your project ID

const databases = new Databases(client);

export { client, databases };
