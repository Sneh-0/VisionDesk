import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRole,
  roleLabel,
  isOwner,
  branchScope,
  canAccessBranch
} from "./roles.js";

test("normalizeRole maps aliases to canonical roles", () => {
  assert.equal(normalizeRole("owner"), "owner");
  assert.equal(normalizeRole("admin"), "owner");
  assert.equal(normalizeRole("branch_admin"), "branch_admin");
  assert.equal(normalizeRole("manager"), "branch_admin");
  assert.equal(normalizeRole("staff"), "staff");
});

test("normalizeRole is case-insensitive", () => {
  assert.equal(normalizeRole("OWNER"), "owner");
  assert.equal(normalizeRole("Manager"), "branch_admin");
});

test("normalizeRole falls back to staff for unknown or missing input", () => {
  assert.equal(normalizeRole(undefined), "staff");
  assert.equal(normalizeRole(null), "staff");
  assert.equal(normalizeRole(""), "staff");
  assert.equal(normalizeRole("superuser"), "staff");
});

test("roleLabel returns the human label for the normalized role", () => {
  assert.equal(roleLabel("admin"), "Owner");
  assert.equal(roleLabel("manager"), "Branch Admin");
  assert.equal(roleLabel("staff"), "Staff");
  assert.equal(roleLabel("nonsense"), "Staff");
});

test("isOwner is true only for owner-aliased roles", () => {
  assert.equal(isOwner({ role: "owner" }), true);
  assert.equal(isOwner({ role: "admin" }), true);
  assert.equal(isOwner({ role: "branch_admin" }), false);
  assert.equal(isOwner({ role: "staff" }), false);
  assert.equal(isOwner(undefined), false);
});

test("branchScope returns null for owners (no branch restriction)", () => {
  assert.equal(branchScope({ role: "owner", branch_id: 3 }), null);
});

test("branchScope returns the user's branch for non-owners", () => {
  assert.equal(branchScope({ role: "staff", branch_id: 7 }), 7);
  assert.equal(branchScope({ role: "branch_admin", branch_id: 2 }), 2);
});

test("branchScope returns null when a non-owner has no branch", () => {
  assert.equal(branchScope({ role: "staff" }), null);
});

test("canAccessBranch lets owners reach any branch", () => {
  const owner = { role: "owner", branch_id: 1 };
  assert.equal(canAccessBranch(owner, 1), true);
  assert.equal(canAccessBranch(owner, 99), true);
});

test("canAccessBranch confines non-owners to their own branch", () => {
  const staff = { role: "staff", branch_id: 4 };
  assert.equal(canAccessBranch(staff, 4), true);
  assert.equal(canAccessBranch(staff, 5), false);
});

test("canAccessBranch compares branch ids across string/number types", () => {
  const staff = { role: "staff", branch_id: 4 };
  // ids can arrive as strings from query params and numbers from the DB
  assert.equal(canAccessBranch(staff, "4"), true);
  assert.equal(canAccessBranch({ role: "staff", branch_id: "4" }, 4), true);
});
