import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    retries: {
      runMode: process.env.CI === "true" ? 2 : 0,
      openMode: 0,
    },
    setupNodeEvents() {
      return undefined;
    },
  },
  screenshotsFolder: "cypress/screenshots",
  screenshotOnRunFailure: true,
  video: false,
  env: {
    apiUrl: "http://localhost:8000",
  },
});
