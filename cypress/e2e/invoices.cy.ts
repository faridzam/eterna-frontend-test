import { ApiEnvelope, TestUser } from "../support/commands";

interface Product {
  readonly id: string;
  readonly quantityOnHand: number;
}

const user: TestUser = {
  name: "Cypress Invoice User",
  email: `cypress-invoice-${Date.now()}@example.com`,
  password: "CypressPassword123!",
};
const productName = `Cypress Invoice Product ${Date.now()}`;
const productSku = `CINV-${Date.now()}`;
const customerName = `Cypress Customer ${Date.now()}`;
const initialQuantity = 3;
const invoiceQuantity = 2;

let productId = "";

describe("invoices", () => {
  before(() => {
    cy.registerAndLogin(user);
    cy.apiRequest<ApiEnvelope<Product>>("POST", "/products", {
      sku: productSku,
      name: productName,
      unitPriceCents: 850,
      quantityOnHand: initialQuantity,
    }).then(({ body }) => {
      productId = body.data.id;
    });
  });

  it("runs the invoice lifecycle and enforces stock and terminal actions", () => {
    cy.visit("/invoices");
    cy.contains("button", "Create invoice").click();
    cy.get('[role="dialog"]').within(() => {
      cy.get("#invoice-customer").type(customerName);
      cy.get("#invoice-product-0").select(productId);
      cy.get("#invoice-quantity-0").clear().type(String(invoiceQuantity));
      cy.contains("dt", "Draft subtotal")
        .parent()
        .find("dd")
        .should("have.text", "$17.00");
      cy.contains("dt", "Draft tax (11%)")
        .parent()
        .find("dd")
        .should("have.text", "$1.87");
      cy.contains("dt", "Draft total")
        .parent()
        .find("dd")
        .should("have.text", "$18.87");
      cy.intercept("POST", "http://localhost:8000/invoices").as("createInvoice");
      cy.contains("button", "Create invoice").click();
    });
    cy.wait("@createInvoice").its("response.statusCode").should("eq", 201);

    cy.contains("button", customerName).click();
    cy.get('[role="dialog"]').as("invoiceDetail").within(() => {
      cy.contains("Status").parent().should("contain", "DRAFT");
      cy.contains("button", "Edit").should("be.visible");
      cy.contains("button", "Issue invoice").should("be.visible");
      cy.contains("button", "Cancel invoice").should("be.visible");
      cy.once("window:confirm", () => true);
      cy.intercept("PATCH", "http://localhost:8000/invoices/*/status").as("issueInvoice");
      cy.contains("button", "Issue invoice").click();
    });
    cy.wait("@issueInvoice").its("response.statusCode").should("eq", 200);
    cy.get("@invoiceDetail").within(() => {
      cy.contains("Status").parent().should("contain", "ISSUED");
      cy.contains("button", "Mark paid").should("be.visible");
      cy.contains("button", "Cancel invoice").should("be.visible");
    });
    cy.apiRequest<ApiEnvelope<Product>>("GET", `/products/${productId}`)
      .its("body.data.quantityOnHand")
      .should("eq", initialQuantity - invoiceQuantity);

    cy.once("window:confirm", () => true);
    cy.intercept("PATCH", "http://localhost:8000/invoices/*/status").as("cancelInvoice");
    cy.get("@invoiceDetail").contains("button", "Cancel invoice").click();
    cy.wait("@cancelInvoice").then(({ request, response }) => {
      expect(request.headers["if-match"]).to.eq("2");
      expect(response?.statusCode).to.eq(200);
    });
    cy.get("@invoiceDetail").within(() => {
      cy.contains("Status").parent().should("contain", "CANCELLED");
      cy.contains("button", "Issue invoice").should("not.exist");
      cy.contains("button", "Mark paid").should("not.exist");
      cy.contains("button", "Cancel invoice").should("not.exist");
    });
    cy.apiRequest<ApiEnvelope<Product>>("GET", `/products/${productId}`)
      .its("body.data.quantityOnHand")
      .should("eq", initialQuantity);

    cy.get('[aria-label="Close invoice detail"]').click();
    cy.contains("button", "Create invoice").click();
    cy.get('[role="dialog"]').within(() => {
      cy.get("#invoice-customer").type(`${customerName} Overstock`);
      cy.get("#invoice-product-0").select(productId);
      cy.get("#invoice-quantity-0").clear().type(String(initialQuantity + 1));
      cy.intercept("POST", "http://localhost:8000/invoices").as("overstockInvoice");
      cy.contains("button", "Create invoice").click();
    });
    cy.wait("@overstockInvoice").its("response.statusCode").should("eq", 400);
    cy.get('[role="dialog"] [role="alert"]')
      .should("be.visible")
      .and("contain", productName);
  });

  it("marks an issued invoice as paid using its updated version", () => {
    cy.visit("/invoices");
    cy.contains("button", "Create invoice").click();
    cy.get('[role="dialog"]').within(() => {
      cy.get("#invoice-customer").type(`${customerName} Paid`);
      cy.get("#invoice-product-0").select(productId);
      cy.get("#invoice-quantity-0").clear().type("1");
      cy.contains("button", "Create invoice").click();
    });

    cy.contains("button", `${customerName} Paid`).click();
    cy.get('[role="dialog"]').as("paidInvoiceDetail").within(() => {
      cy.once("window:confirm", () => true);
      cy.intercept("PATCH", "http://localhost:8000/invoices/*/status").as("issuePaidInvoice");
      cy.contains("button", "Issue invoice").click();
    });
    cy.wait("@issuePaidInvoice").its("response.statusCode").should("eq", 200);
    cy.get("@paidInvoiceDetail").within(() => {
      cy.once("window:confirm", () => true);
      cy.intercept("PATCH", "http://localhost:8000/invoices/*/status").as("markInvoicePaid");
      cy.contains("button", "Mark paid").click();
    });
    cy.wait("@markInvoicePaid").then(({ request, response }) => {
      expect(request.headers["if-match"]).to.eq("2");
      expect(response?.statusCode).to.eq(200);
    });
    cy.get("@paidInvoiceDetail").contains("Status").parent().should("contain", "PAID");
  });
});
