// Compute a smart match score given user preferences and a property.
// Returns {score: 0-100, reasons: []}
export function computeMatch(preferences = {}, property) {
  if (!property) return { score: 0, reasons: [] };
  let total = 0; let max = 0;
  const reasons = [];

  // Budget (30 pts)
  if (preferences.max_budget) {
    max += 30;
    const ratio = property.rent / preferences.max_budget;
    if (ratio <= 0.85) { total += 30; reasons.push("Within budget"); }
    else if (ratio <= 1.0) { total += 22; reasons.push("Close to budget"); }
    else if (ratio <= 1.15) { total += 10; reasons.push("Slightly over budget"); }
    else { reasons.push("Over budget"); }
  }

  // Amenities (25 pts)
  const wanted = ["ac", "wifi", "parking", "balcony", "attached_bath"].filter((k) => preferences[k]);
  if (wanted.length) {
    max += 25;
    const have = wanted.filter((k) => property[k]).length;
    const ratio = have / wanted.length;
    total += Math.round(25 * ratio);
    if (ratio === 1) reasons.push("Has all wanted amenities");
    else if (ratio > 0.5) reasons.push("Has most wanted amenities");
  }

  // Furnishing (15 pts)
  if (preferences.furnished) {
    max += 15;
    if (property.furnished === preferences.furnished) { total += 15; reasons.push(`${preferences.furnished} as preferred`); }
    else if (property.furnished === "Semi-Furnished" && preferences.furnished !== "Unfurnished") { total += 8; }
  }

  // Property type (15 pts)
  if (preferences.property_type) {
    max += 15;
    if (property.property_type === preferences.property_type) { total += 15; reasons.push(`Matches preferred ${preferences.property_type}`); }
  }

  // Lifestyle tags (15 pts)
  if (preferences.lifestyle_tags?.length) {
    max += 15;
    const pTags = property.lifestyle_tags || [];
    const overlap = preferences.lifestyle_tags.filter((t) => pTags.includes(t)).length;
    total += Math.round(15 * (overlap / preferences.lifestyle_tags.length));
    if (overlap) reasons.push(`${overlap} matching lifestyle tag${overlap > 1 ? "s" : ""}`);
  }

  if (max === 0) return { score: 0, reasons: ["Set preferences for a match score"] };
  const score = Math.round((total / max) * 100);
  return { score, reasons };
}

export function loadPrefs() {
  try { return JSON.parse(localStorage.getItem("km_prefs") || "{}"); } catch { return {}; }
}
export function savePrefs(p) {
  localStorage.setItem("km_prefs", JSON.stringify(p));
}
