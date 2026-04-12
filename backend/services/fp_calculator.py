from config import Config


def calculate_ufc(counts: dict) -> int:
    """Unadjusted Function Count."""
    weights = Config.FP_WEIGHTS
    return sum(counts.get(key, 0) * weights[key] for key in weights)


def calculate_fp(counts: dict) -> dict:
    """
    Full Function Point calculation.

    Returns a result dict with:
      - component counts (EI, EO, EQ, ILF, EIF)
      - UFC, VAF, FP
      - Effort, Time, Cost estimates
    """
    ufc = calculate_ufc(counts)
    vaf = Config.VAF
    fp = round(ufc * vaf, 2)

    effort = round(fp / Config.EFFORT_DIVISOR, 2)       # person-months
    time = round(effort / Config.TIME_DIVISOR, 2)        # calendar months
    cost = round(effort * Config.COST_PER_EFFORT, 2)     # USD

    return {
        "counts": {
            "EI": counts.get("EI", 0),
            "EO": counts.get("EO", 0),
            "EQ": counts.get("EQ", 0),
            "ILF": counts.get("ILF", 0),
            "EIF": counts.get("EIF", 0),
        },
        "weights": Config.FP_WEIGHTS,
        "ufc": ufc,
        "vaf": vaf,
        "fp": fp,
        "effort": effort,
        "time": time,
        "cost": cost,
    }


def recalculate(counts: dict) -> dict:
    """Recalculate FP from user-edited counts."""
    # Sanitize input
    cleaned = {}
    for key in Config.FP_WEIGHTS:
        val = counts.get(key, 0)
        try:
            cleaned[key] = max(0, int(val))
        except (TypeError, ValueError):
            cleaned[key] = 0
    return calculate_fp(cleaned)
