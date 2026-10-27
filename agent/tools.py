"""
Deterministic Economic Tools for Micro-Grants Decision Support
A4I 2026 - Challenge 3: Community Economic Resilience & Micro-Grants

RULE: Tools decide dollar amounts and exposure calculations deterministically;
Gemini writes the justification and the memorandum.
"""

from typing import List, Dict, Any


def score_exposure(
    footfall_share: float = 0.0,
    supply_intensity: float = 0.0,
    downstream_impact_weight: float = 1.0,
) -> float:
    """
    Calculate normalized exposure risk score for a business.
    Footfall loss represents direct pedestrian shock.
    Supply intensity represents upstream dependency shock.
    """
    # Footfall loss has immediate cashflow friction
    # Upstream supply disruption carries multiplier through downstream buyers
    raw_score = (0.55 * footfall_share) + (0.45 * supply_intensity * downstream_impact_weight)
    return round(min(1.0, max(0.0, raw_score)), 3)


def fragility_score(
    has_sba_loan: bool,
    sba_charge_off: bool,
    years_registered: int,
    cash_cushion_months: float = 2.0,
) -> float:
    """
    Evaluate structural resilience / fragility of an applicant.
    Healthy track record reduces fragility; defaults or zero cushion increases it.
    """
    score = 0.5
    if sba_charge_off:
        score += 0.4
    elif has_sba_loan:
        score -= 0.15  # established credit access

    if years_registered > 5:
        score -= 0.15

    if cash_cushion_months < 1.0:
        score += 0.2
    elif cash_cushion_months > 3.0:
        score -= 0.2

    return round(min(1.0, max(0.05, score)), 3)


def allocate_budget(
    businesses: List[Dict[str, Any]],
    total_budget: float,
    grant_effect_assumption: float = 0.3,
) -> List[Dict[str, Any]]:
    """
    Deterministically allocate grant amounts avoiding hub-monopoly traps.
    Weights upstream multipliers to protect multi-hop supply lines,
    while setting minimum effective grant floors ($2,000) and max caps ($15,000).
    """
    candidates = []
    for b in businesses:
        exposure = b.get("exposure", 0.0)
        protects_count = len(b.get("protects", []))
        role = b.get("role", "independent")

        # Multi-hop upstream suppliers carry higher resilience leverage
        multiplier = 1.0
        if role == "upstream_supplier":
            multiplier = 1.45 + (0.1 * min(protects_count, 4))
        elif role == "anchor_direct":
            multiplier = 1.15
        elif role == "retail_leaf":
            multiplier = 0.35

        # Factor in grant effect assumption
        # High grant effect elevates acute retail distress
        if grant_effect_assumption >= 0.5 and role == "anchor_direct":
            multiplier *= 1.3

        raw_need = exposure * multiplier
        if raw_need > 0.15:
            candidates.append((b, raw_need))

    if not candidates:
        return businesses

    total_weight = sum(w for _, w in candidates)
    results = []

    # Map candidate allocations
    allocated_map = {}
    for b, weight in candidates:
        prop = weight / total_weight
        calc_amt = round((total_budget * prop) / 500) * 500
        # Guardrails: Min $2,000, Max $15,000
        bounded_amt = min(15000, max(2000, calc_amt))
        allocated_map[b["business_id"]] = bounded_amt

    # Rebalance to ensure sum equals or approaches total_budget
    total_allocated = sum(allocated_map.values())
    if total_allocated > total_budget:
        # Scale back highest
        diff = total_allocated - total_budget
        sorted_keys = sorted(allocated_map.keys(), key=lambda k: allocated_map[k], reverse=True)
        for k in sorted_keys:
            if diff <= 0:
                break
            can_cut = allocated_map[k] - 2000
            cut = min(diff, can_cut)
            allocated_map[k] -= cut
            diff -= cut

    # Build updated business records
    for b in businesses:
        b_copy = dict(b)
        bid = b["business_id"]
        if bid in allocated_map and allocated_map[bid] >= 2000:
            b_copy["status"] = "funded"
            b_copy["amount"] = int(allocated_map[bid])
        elif b_copy.get("exposure", 0.0) > 0.15:
            b_copy["status"] = "exposed_not_funded"
            b_copy["amount"] = 0
        else:
            b_copy["status"] = "unaffected"
            b_copy["amount"] = 0
        results.append(b_copy)

    return results


def evaluate_sensitivity(
    businesses: List[Dict[str, Any]],
    total_budget: float,
) -> Dict[str, Any]:
    """
    Test recommendation stability under 0.5x and 2.0x assumptions.
    """
    alloc_low = allocate_budget(businesses, total_budget, 0.15)
    alloc_high = allocate_budget(businesses, total_budget, 0.6)

    # Top pick at baseline
    base_funded = [b for b in businesses if b.get("status") == "funded"]
    top_base = sorted(base_funded, key=lambda x: x.get("amount", 0), reverse=True)
    top_base_id = top_base[0]["business_id"] if top_base else None

    # Top pick at 0.5x
    funded_low = [b for b in alloc_low if b.get("status") == "funded"]
    top_low = sorted(funded_low, key=lambda x: x.get("amount", 0), reverse=True)
    top_low_id = top_low[0]["business_id"] if top_low else None

    # Top pick at 2.0x
    funded_high = [b for b in alloc_high if b.get("status") == "funded"]
    top_high = sorted(funded_high, key=lambda x: x.get("amount", 0), reverse=True)
    top_high_id = top_high[0]["business_id"] if top_high else None

    stable_low = top_base_id == top_low_id
    stable_high = top_base_id == top_high_id

    return {
        "top_pick_stable_at_0.5x": stable_low,
        "top_pick_stable_at_2x": stable_high,
        "notes": (
            "Invariant top priority across variations."
            if (stable_low and stable_high)
            else "Acute retail shock shifts marginal capital toward direct storefronts under 2.0x assumption."
        ),
    }
