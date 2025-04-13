declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    TOKEN: string;
    CLIENT_ID: string;
    GUILD_ID: string;
  }
}
