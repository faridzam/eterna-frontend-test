import { TestUser } from "../support/commands";

const admin: TestUser = {
  name: "StockFlow Admin",
  email: "admin@stockflow.com",
  password: "stockflow",
};
const productName = `Cypress Product ${Date.now()}`;
const productSku = `CYP-${Date.now()}`;

describe("products", () => {
  beforeEach(() => {
    cy.loginSession(admin);
  });

  it("creates, searches, edits, and soft-deletes a product", () => {
    cy.visit("/products");
    cy.contains("button", "Create product").click();
    cy.get('[role="dialog"]').within(() => {
      cy.get("#product-sku").type(productSku);
      cy.get("#product-name").type(productName);
      cy.get("#product-unitPriceCents").type("850");
      cy.get("#product-quantityOnHand").type("12");
      cy.contains("button", "Add product").click();
    });

    cy.contains("h3", productName).should("be.visible");
    cy.get("#product-search").type(productSku);
    cy.contains("button", "Search").click();
    cy.contains("h3", productName).should("be.visible");

    cy.contains("h3", productName)
      .closest("article")
      .within(() => cy.contains("button", "Edit").click());
    cy.get('[role="dialog"]').within(() => {
      cy.get("#product-name").clear().type(`${productName} Edited`);
      cy.contains("button", "Save changes").click();
    });
    cy.contains("h3", `${productName} Edited`).should("be.visible");

    cy.once("window:confirm", () => true);
    cy.contains("h3", `${productName} Edited`)
      .closest("article")
      .within(() => cy.contains("button", "Delete").click());
    cy.contains("h3", `${productName} Edited`).should("not.exist");
  });
});
