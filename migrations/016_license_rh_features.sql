UPDATE license_plans
SET features_json = JSON_ARRAY_APPEND(features_json, '$', 'hr_screening')
WHERE slug IN ('pro', 'enterprise', 'plano-flex')
  AND JSON_VALID(features_json)
  AND features_json NOT LIKE '%"hr_screening"%';

UPDATE license_plans
SET features_json = JSON_ARRAY_APPEND(features_json, '$', 'behavior_profile')
WHERE slug IN ('pro', 'enterprise', 'plano-flex')
  AND JSON_VALID(features_json)
  AND features_json NOT LIKE '%"behavior_profile"%';
