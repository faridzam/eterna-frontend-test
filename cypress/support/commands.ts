export interface TestUser {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export interface ApiEnvelope<T> {
  readonly message: string;
  readonly data: T;
}

const apiUrl = "http://localhost:8000";
const frontendOrigin = "http://localhost:3000";

Cypress.Commands.add("registerThroughUi", (user: TestUser) => {
  cy.visit("/register");
  cy.get("#name").type(user.name);
  cy.get("#email").type(user.email);
  cy.get("#password").type(user.password);
  cy.get("form").find("button[type='submit']").click();
  cy.location("pathname").should("eq", "/login");
});

Cypress.Commands.add("loginSession", (user: TestUser) => {
  cy.session(
    user.email,
    () => {
      cy.visit("/login");
      cy.get("#email").type(user.email);
      cy.get("#password").type(user.password);
      cy.get("form").find("button[type='submit']").click();
      cy.location("pathname").should("eq", "/");
    },
    {
      validate: () => {
        cy.request({
          method: "GET",
          url: `${apiUrl}/auth/me`,
          failOnStatusCode: false,
        })
          .its("status")
          .should("eq", 200);
      },
    },
  );
});

Cypress.Commands.add("registerAndLogin", (user: TestUser) => {
  cy.session(
    user.email,
    () => {
      cy.registerThroughUi(user);
      cy.get("#email").type(user.email);
      cy.get("#password").type(user.password);
      cy.get("form").find("button[type='submit']").click();
      cy.location("pathname").should("eq", "/");
    },
    {
      validate: () => {
        cy.request({
          method: "GET",
          url: `${apiUrl}/auth/me`,
          failOnStatusCode: false,
        })
          .its("status")
          .should("eq", 200);
      },
    },
  );
});

Cypress.Commands.add(
  "apiRequest",
  <T>(method: Cypress.HttpMethod, path: string, body?: Cypress.RequestBody) =>
    cy.request<T>({
      method,
      url: `${apiUrl}${path}`,
      body,
      headers: {
        "Content-Type": "application/json",
        Origin: frontendOrigin,
      },
      failOnStatusCode: false,
    }),
);

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      apiRequest<T>(
        method: HttpMethod,
        path: string,
        body?: RequestBody,
      ): Chainable<Response<T>>;
      loginSession(user: TestUser): Chainable<void>;
      registerAndLogin(user: TestUser): Chainable<void>;
      registerThroughUi(user: TestUser): Chainable<void>;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export { };

