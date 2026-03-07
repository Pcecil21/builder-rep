export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48) || "builder";
}

export function titleCaseFromEmail(email) {
  const local = String(email ?? "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();

  if (!local) {
    return "Builder";
  }

  return local.replace(/\b\w/g, (character) => character.toUpperCase());
}
