import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const prismaMock = vi.hoisted(() => ({
  section: { findFirst: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
  category: { findFirst: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { findOrCreateCreditCardPaymentCategory } from "./creditCardPaymentCategory";

const BUDGET_ID = "budget-1";
const SECTION_NAME = "Credit Card Payments";

describe("findOrCreateCreditCardPaymentCategory", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates the section and the hidden category when neither exists", async () => {
    prismaMock.section.findFirst.mockResolvedValue(null);
    prismaMock.section.aggregate.mockResolvedValue({ _max: { order: 4 } });
    prismaMock.section.create.mockResolvedValue({ id: "section-1" });
    prismaMock.category.findFirst.mockResolvedValue(null);
    prismaMock.category.aggregate.mockResolvedValue({ _max: { order: null } });
    prismaMock.category.create.mockResolvedValue({ id: "category-1" });

    const id = await findOrCreateCreditCardPaymentCategory(BUDGET_ID, " Visa ", SECTION_NAME);

    expect(id).toBe("category-1");
    expect(prismaMock.section.create).toHaveBeenCalledWith({
      data: { budgetId: BUDGET_ID, name: SECTION_NAME, isCreditCardPayment: true, order: 5 },
    });
    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: { sectionId: "section-1", name: "Visa", hideFromBudget: true, order: 0 },
    });
  });

  it("reuses an existing section and category without creating anything", async () => {
    prismaMock.section.findFirst.mockResolvedValue({ id: "section-1" });
    prismaMock.category.findFirst.mockResolvedValue({ id: "category-1" });

    const id = await findOrCreateCreditCardPaymentCategory(BUDGET_ID, "Visa", SECTION_NAME);

    expect(id).toBe("category-1");
    expect(prismaMock.section.create).not.toHaveBeenCalled();
    expect(prismaMock.category.create).not.toHaveBeenCalled();
  });

  it("creates only the category when the section already exists", async () => {
    prismaMock.section.findFirst.mockResolvedValue({ id: "section-1" });
    prismaMock.category.findFirst.mockResolvedValue(null);
    prismaMock.category.aggregate.mockResolvedValue({ _max: { order: 2 } });
    prismaMock.category.create.mockResolvedValue({ id: "category-2" });

    const id = await findOrCreateCreditCardPaymentCategory(BUDGET_ID, "Amex", SECTION_NAME);

    expect(id).toBe("category-2");
    expect(prismaMock.section.create).not.toHaveBeenCalled();
    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: { sectionId: "section-1", name: "Amex", hideFromBudget: true, order: 3 },
    });
  });

  it("looks up the category by name case-insensitively among hidden categories", async () => {
    prismaMock.section.findFirst.mockResolvedValue({ id: "section-1" });
    prismaMock.category.findFirst.mockResolvedValue({ id: "category-1" });

    await findOrCreateCreditCardPaymentCategory(BUDGET_ID, "visa", SECTION_NAME);

    expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
      where: {
        sectionId: "section-1",
        hideFromBudget: true,
        name: { equals: "visa", mode: "insensitive" },
      },
    });
  });
});
