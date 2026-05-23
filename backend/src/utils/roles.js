const ROLE_ALIASES = {
  owner: "owner",
  admin: "owner",
  branch_admin: "branch_admin",
  manager: "branch_admin",
  staff: "staff"
};

const ROLE_LABELS = {
  owner: "Owner",
  branch_admin: "Branch Admin",
  staff: "Staff"
};

export const normalizeRole = (role) => ROLE_ALIASES[String(role || "staff").toLowerCase()] || "staff";

export const roleLabel = (role) => ROLE_LABELS[normalizeRole(role)] || ROLE_LABELS.staff;

export const isOwner = (user) => normalizeRole(user?.role) === "owner";

export const branchScope = (user) => (isOwner(user) ? null : user?.branch_id ?? null);

export const canAccessBranch = (user, branchId) => {
  if (isOwner(user)) return true;
  return String(user?.branch_id) === String(branchId);
};
