| table_schema | table_name             | column_name                  | data_type                | is_nullable |
| ------------ | ---------------------- | ---------------------------- | ------------------------ | ----------- |
| auth         | audit_log_entries      | instance_id                  | uuid                     | YES         |
| auth         | audit_log_entries      | id                           | uuid                     | NO          |
| auth         | audit_log_entries      | payload                      | json                     | YES         |
| auth         | audit_log_entries      | created_at                   | timestamp with time zone | YES         |
| auth         | audit_log_entries      | ip_address                   | character varying        | NO          |
| auth         | custom_oauth_providers | id                           | uuid                     | NO          |
| auth         | custom_oauth_providers | provider_type                | text                     | NO          |
| auth         | custom_oauth_providers | identifier                   | text                     | NO          |
| auth         | custom_oauth_providers | name                         | text                     | NO          |
| auth         | custom_oauth_providers | client_id                    | text                     | NO          |
| auth         | custom_oauth_providers | client_secret                | text                     | NO          |
| auth         | custom_oauth_providers | acceptable_client_ids        | ARRAY                    | NO          |
| auth         | custom_oauth_providers | scopes                       | ARRAY                    | NO          |
| auth         | custom_oauth_providers | pkce_enabled                 | boolean                  | NO          |
| auth         | custom_oauth_providers | attribute_mapping            | jsonb                    | NO          |
| auth         | custom_oauth_providers | authorization_params         | jsonb                    | NO          |
| auth         | custom_oauth_providers | enabled                      | boolean                  | NO          |
| auth         | custom_oauth_providers | email_optional               | boolean                  | NO          |
| auth         | custom_oauth_providers | issuer                       | text                     | YES         |
| auth         | custom_oauth_providers | discovery_url                | text                     | YES         |
| auth         | custom_oauth_providers | skip_nonce_check             | boolean                  | NO          |
| auth         | custom_oauth_providers | cached_discovery             | jsonb                    | YES         |
| auth         | custom_oauth_providers | discovery_cached_at          | timestamp with time zone | YES         |
| auth         | custom_oauth_providers | authorization_url            | text                     | YES         |
| auth         | custom_oauth_providers | token_url                    | text                     | YES         |
| auth         | custom_oauth_providers | userinfo_url                 | text                     | YES         |
| auth         | custom_oauth_providers | jwks_uri                     | text                     | YES         |
| auth         | custom_oauth_providers | created_at                   | timestamp with time zone | NO          |
| auth         | custom_oauth_providers | updated_at                   | timestamp with time zone | NO          |
| auth         | custom_oauth_providers | custom_claims_allowlist      | ARRAY                    | NO          |
| auth         | flow_state             | id                           | uuid                     | NO          |
| auth         | flow_state             | user_id                      | uuid                     | YES         |
| auth         | flow_state             | auth_code                    | text                     | YES         |
| auth         | flow_state             | code_challenge_method        | USER-DEFINED             | YES         |
| auth         | flow_state             | code_challenge               | text                     | YES         |
| auth         | flow_state             | provider_type                | text                     | NO          |
| auth         | flow_state             | provider_access_token        | text                     | YES         |
| auth         | flow_state             | provider_refresh_token       | text                     | YES         |
| auth         | flow_state             | created_at                   | timestamp with time zone | YES         |
| auth         | flow_state             | updated_at                   | timestamp with time zone | YES         |
| auth         | flow_state             | authentication_method        | text                     | NO          |
| auth         | flow_state             | auth_code_issued_at          | timestamp with time zone | YES         |
| auth         | flow_state             | invite_token                 | text                     | YES         |
| auth         | flow_state             | referrer                     | text                     | YES         |
| auth         | flow_state             | oauth_client_state_id        | uuid                     | YES         |
| auth         | flow_state             | linking_target_id            | uuid                     | YES         |
| auth         | flow_state             | email_optional               | boolean                  | NO          |
| auth         | identities             | provider_id                  | text                     | NO          |
| auth         | identities             | user_id                      | uuid                     | NO          |
| auth         | identities             | identity_data                | jsonb                    | NO          |
| auth         | identities             | provider                     | text                     | NO          |
| auth         | identities             | last_sign_in_at              | timestamp with time zone | YES         |
| auth         | identities             | created_at                   | timestamp with time zone | YES         |
| auth         | identities             | updated_at                   | timestamp with time zone | YES         |
| auth         | identities             | email                        | text                     | YES         |
| auth         | identities             | id                           | uuid                     | NO          |
| auth         | instances              | id                           | uuid                     | NO          |
| auth         | instances              | uuid                         | uuid                     | YES         |
| auth         | instances              | raw_base_config              | text                     | YES         |
| auth         | instances              | created_at                   | timestamp with time zone | YES         |
| auth         | instances              | updated_at                   | timestamp with time zone | YES         |
| auth         | mfa_amr_claims         | session_id                   | uuid                     | NO          |
| auth         | mfa_amr_claims         | created_at                   | timestamp with time zone | NO          |
| auth         | mfa_amr_claims         | updated_at                   | timestamp with time zone | NO          |
| auth         | mfa_amr_claims         | authentication_method        | text                     | NO          |
| auth         | mfa_amr_claims         | id                           | uuid                     | NO          |
| auth         | mfa_challenges         | id                           | uuid                     | NO          |
| auth         | mfa_challenges         | factor_id                    | uuid                     | NO          |
| auth         | mfa_challenges         | created_at                   | timestamp with time zone | NO          |
| auth         | mfa_challenges         | verified_at                  | timestamp with time zone | YES         |
| auth         | mfa_challenges         | ip_address                   | inet                     | NO          |
| auth         | mfa_challenges         | otp_code                     | text                     | YES         |
| auth         | mfa_challenges         | web_authn_session_data       | jsonb                    | YES         |
| auth         | mfa_factors            | id                           | uuid                     | NO          |
| auth         | mfa_factors            | user_id                      | uuid                     | NO          |
| auth         | mfa_factors            | friendly_name                | text                     | YES         |
| auth         | mfa_factors            | factor_type                  | USER-DEFINED             | NO          |
| auth         | mfa_factors            | status                       | USER-DEFINED             | NO          |
| auth         | mfa_factors            | created_at                   | timestamp with time zone | NO          |
| auth         | mfa_factors            | updated_at                   | timestamp with time zone | NO          |
| auth         | mfa_factors            | secret                       | text                     | YES         |
| auth         | mfa_factors            | phone                        | text                     | YES         |
| auth         | mfa_factors            | last_challenged_at           | timestamp with time zone | YES         |
| auth         | mfa_factors            | web_authn_credential         | jsonb                    | YES         |
| auth         | mfa_factors            | web_authn_aaguid             | uuid                     | YES         |
| auth         | mfa_factors            | last_webauthn_challenge_data | jsonb                    | YES         |
| auth         | oauth_authorizations   | id                           | uuid                     | NO          |
| auth         | oauth_authorizations   | authorization_id             | text                     | NO          |
| auth         | oauth_authorizations   | client_id                    | uuid                     | NO          |
| auth         | oauth_authorizations   | user_id                      | uuid                     | YES         |
| auth         | oauth_authorizations   | redirect_uri                 | text                     | NO          |
| auth         | oauth_authorizations   | scope                        | text                     | NO          |
| auth         | oauth_authorizations   | state                        | text                     | YES         |
| auth         | oauth_authorizations   | resource                     | text                     | YES         |
| auth         | oauth_authorizations   | code_challenge               | text                     | YES         |
| auth         | oauth_authorizations   | code_challenge_method        | USER-DEFINED             | YES         |
| auth         | oauth_authorizations   | response_type                | USER-DEFINED             | NO          |
| auth         | oauth_authorizations   | status                       | USER-DEFINED             | NO          |
| auth         | oauth_authorizations   | authorization_code           | text                     | YES         |
| auth         | oauth_authorizations   | created_at                   | timestamp with time zone | NO          |
A couple of notes
getOverlaps uses .rpc() because Supabase's PostgREST client can't express ST_Intersects/ST_Intersection spatial joins through the normal .from().select() query builder — this is the standard pattern for anything PostGIS-specific with Supabase: write a SQL function once, call it via .rpc('function_name') from JS. Same pattern would apply if you later need ST_Distance for centroid-shift alert logic.
alerts table join syntax (select('*, individuals(tag, name)')) — this is Supabase's embedded-resource syntax, pulling the related individual's tag/name in one query via the foreign key, instead of a second round trip.
Since there's no real data flowing from the ML pipeline yet, test both of these the same way as before: manually insert a couple of home_ranges and alerts rows via SQL Editor, then hit the endpoints.