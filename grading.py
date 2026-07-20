import json


DEFAULT_CONCEPT_BANDS = [
    {"min": 0, "code": "I", "label": "Irregular"},
    {"min": 50, "code": "R", "label": "Regular"},
    {"min": 70, "code": "B", "label": "Bom"},
    {"min": 90, "code": "MB", "label": "Muito bom"},
]


def _number(value, default=0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def normalize_grading_scale(value=None):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, json.JSONDecodeError):
            value = {}
    value = value if isinstance(value, dict) else {}
    scale_type = value.get("type") if value.get("type") in {"numeric", "concept"} else "numeric"
    maximum = int(_number(value.get("maximum"), 100))
    maximum = maximum if maximum in {5, 10, 100} else 100
    default_decimals = 0 if maximum == 100 else 1
    decimals = int(max(0, min(2, _number(value.get("decimals"), default_decimals))))

    bands = []
    raw_bands = value.get("bands") if isinstance(value.get("bands"), list) else []
    for item in raw_bands:
        if not isinstance(item, dict):
            continue
        code = str(item.get("code") or "").strip()[:8]
        label = str(item.get("label") or "").strip()[:50]
        if not code or not label:
            continue
        minimum = round(max(0, min(100, _number(item.get("min")))), 2)
        bands.append({"min": minimum, "code": code, "label": label})
    if len(bands) < 2:
        bands = [item.copy() for item in DEFAULT_CONCEPT_BANDS]
    bands.sort(key=lambda item: item["min"])
    bands[0]["min"] = 0
    return {"type": scale_type, "maximum": maximum, "decimals": decimals, "bands": bands[:8]}


def grading_scale_json(value=None):
    return json.dumps(normalize_grading_scale(value), ensure_ascii=False)


def grade_for_score(score, scale=None):
    normalized = normalize_grading_scale(scale)
    percentage = round(max(0, min(100, _number(score))), 2)
    if normalized["type"] == "concept":
        band = normalized["bands"][0]
        for candidate in normalized["bands"]:
            if percentage >= candidate["min"]:
                band = candidate
        return {
            "type": "concept", "value": band["code"], "label": band["label"],
            "maximum": None, "percent": percentage,
        }
    maximum = normalized["maximum"]
    value = round(percentage * maximum / 100, normalized["decimals"])
    return {"type": "numeric", "value": value, "label": "", "maximum": maximum, "percent": percentage}
