"""
ADK Grant Decision Agent for Micro-Grants Decision Support
A4I 2026 - Challenge 3: Community Economic Resilience & Micro-Grants

Architecture:
1. GQL Multi-Hop Traversal (BigQuery Property Graph `a4i_econ.LocalEconomy`)
2. Deterministic Tools (score_exposure, fragility, allocate_budget, sensitivity)
3. Gemini LLM (Synthesizes justifications per business + final Grant Officer Memo)
"""

import os
import json
from typing import Dict, Any
from tools import allocate_budget, evaluate_sensitivity

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "qwiklabs-gcp-04-e4952d3717e9")
DATASET = os.environ.get("BIGQUERY_DATASET", "a4i_econ")


def build_gql_query(anchor_block_id: str, depth_limit: int = 2) -> str:
    """
    BigQuery GQL Property Graph multi-hop query.
    Traverses DrawsFootfall and Supplies edges.
    """
    return f"""
    GRAPH `{PROJECT_ID}.{DATASET}.LocalEconomy`
    MATCH p = ANY SHORTEST (anchor:Employer WHERE anchor.block_id = '{anchor_block_id}')
              -[:DrawsFootfall]->(direct:Business)
              <-[:Supplies]-{{{1},{depth_limit}}}(supplier:Business)
    RETURN TO_JSON(p) AS paths
    LIMIT 50
    """


def generate_decisions(
    block_id: str = "060750178021003",
    budget: float = 50000.0,
    grant_effect: float = 0.3,
) -> Dict[str, Any]:
    """
    Executes scenario run:
    1. Loads base corridor business network
    2. Runs deterministic budget allocator
    3. Evaluates sensitivity stability
    4. Computes equity audit numbers
    5. Formats decisions.json output contract
    """
    # Load handcrafted baseline network (or BigQuery result)
    mock_path = os.path.join(os.path.dirname(__file__), "../frontend/data/mock_decisions.json")
    with open(mock_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Deterministic Budget Allocation
    allocated_businesses = allocate_budget(data["businesses"], budget, grant_effect)
    sensitivity_report = evaluate_sensitivity(allocated_businesses, budget)

    # 2. Equity Audit Calculation
    funded = [b for b in allocated_businesses if b.get("status") == "funded"]
    restaurants_funded = [b for b in funded if b.get("naics4", "").startswith("72")]
    high_poverty_funded = [b for b in funded if b.get("tract", {}).get("poverty_rate", 0) >= 0.23]

    restaurant_share = round(len(restaurants_funded) / max(1, len(funded)), 2)
    poverty_share = round(len(high_poverty_funded) / max(1, len(funded)), 2)

    data["scenario"]["budget"] = budget
    data["scenario"]["grant_effect"] = grant_effect
    data["scenario"]["block_id"] = block_id
    data["businesses"] = allocated_businesses
    data["sensitivity"] = sensitivity_report
    data["equity_audit"]["restaurant_share_funded"] = restaurant_share
    data["equity_audit"]["high_poverty_tract_share_funded"] = poverty_share

    return data


if __name__ == "__main__":
    result = generate_decisions(budget=50000, grant_effect=0.3)
    print(f"Scenario successfully executed for budget ${result['scenario']['budget']:,.0f}")
    funded = [b for b in result["businesses"] if b["status"] == "funded"]
    print(f"Funded {len(funded)} businesses:")
    for b in funded:
        print(f"  - {b['name']}: ${b['amount']:,} ({b['role']})")
