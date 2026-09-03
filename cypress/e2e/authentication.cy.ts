import { TestUser } from "../support/commands";

const user: TestUser = {
  name: "Cypress Auth User",
  email: `cypress-auth-${Date.now()}@example.com`,
  password: "CypressPassword123!",
};

describe("authentication", () => {
  before(() => {
    cy.registerThroughUi(user);
  });

  it("redirects unauthenticated users to login", () => {
    cy.visit("/products");
    cy.location("pathname").should("eq", "/login");
  });

  it("shows the server error for a wrong password", () => {
    cy.visit("/login");
    cy.get("#email").type(user.email);
    cy.get("#password").type("WrongPassword123!");
    cy.get("form").find("button[type='submit']").click();
    cy.get('[role="alert"]')
      .should("be.visible")
      .and("contain", "Your email or password is incorrect.");
  });

  it("opens the authenticated workspace after a successful login", () => {
    cy.loginSession(user);
    cy.visit("/");
    cy.get("#welcome-title").should("contain", user.name);
    cy.contains("button", "Sign out").should("be.visible");
  });

  it("logs out and invalidates the session", () => {
    cy.loginSession(user);
    cy.visit("/");
    cy.contains("button", "Sign out").click();
    cy.location("pathname").should("eq", "/login");
    cy.apiRequest("GET", "/auth/me").its("status").should("eq", 401);
  });
});
