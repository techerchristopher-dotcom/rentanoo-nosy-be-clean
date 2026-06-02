import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeBillableRentalDays,
  computeReturnDayFraction,
  computeBaseRentalPrice,
} from "./rentalPriceFromDates.ts";

function d(y: number, m: number, day: number): Date {
  return new Date(y, m - 1, day);
}

describe("computeReturnDayFraction", () => {
  it("before 9:00 returns 0", () => {
    assert.equal(computeReturnDayFraction("08:59"), 0);
  });

  it("9:00 to 12:00 returns 0.5", () => {
    assert.equal(computeReturnDayFraction("09:00"), 0.5);
    assert.equal(computeReturnDayFraction("12:00"), 0.5);
  });

  it("after 12:00 returns 1", () => {
    assert.equal(computeReturnDayFraction("12:01"), 1);
    assert.equal(computeReturnDayFraction("15:00"), 1);
  });
});

describe("computeBillableRentalDays", () => {
  it("Tobias: 1 juin 06:30 → 4 juin 15:00 = 4 jours", () => {
    const days = computeBillableRentalDays(
      d(2026, 6, 1),
      d(2026, 6, 4),
      "06:30",
      "15:00"
    );
    assert.equal(days, 4);
  });

  it("1 juin 06:30 → 2 juin 08:00 = 1 jour (retour avant 9h)", () => {
    assert.equal(
      computeBillableRentalDays(d(2026, 6, 1), d(2026, 6, 2), "06:30", "08:00"),
      1
    );
  });

  it("1 juin 06:30 → 2 juin 10:30 = 1.5 jour", () => {
    assert.equal(
      computeBillableRentalDays(d(2026, 6, 1), d(2026, 6, 2), "06:30", "10:30"),
      1.5
    );
  });

  it("1 juin 06:30 → 2 juin 15:00 = 2 jours", () => {
    assert.equal(
      computeBillableRentalDays(d(2026, 6, 1), d(2026, 6, 2), "06:30", "15:00"),
      2
    );
  });

  it("same day 06:30 → 15:00 = 1 jour max", () => {
    assert.equal(
      computeBillableRentalDays(d(2026, 6, 1), d(2026, 6, 1), "06:30", "15:00"),
      1
    );
  });

  it("same day 06:30 → 10:00 = 1 jour max", () => {
    assert.equal(
      computeBillableRentalDays(d(2026, 6, 1), d(2026, 6, 1), "06:30", "10:00"),
      1
    );
  });
});

describe("computeBaseRentalPrice", () => {
  it("4 jours × 14€ = 56€", () => {
    const start = d(2026, 6, 1);
    start.setHours(6, 30, 0, 0);
    const end = d(2026, 6, 4);
    end.setHours(15, 0, 0, 0);
    const { basePrice, rentalDays } = computeBaseRentalPrice(14, start, end);
    assert.equal(rentalDays, 4);
    assert.equal(basePrice, 56);
  });
});
