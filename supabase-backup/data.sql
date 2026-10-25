-- claude-usage-dashboard veri yedeği (2026-10-25)
-- Önce schema.sql çalıştırılmalı. auth.users kaydı için bkz. auth-users.json (Auth Admin API ile içe aktarın).
-- Boş tablolar (satır yok): organization_invites, api_keys, usage_records, usage_daily, cost_daily

begin;

insert into public.organizations (id, name, plan_type, created_at, theme_font, theme_color) values
  ('b4f6db91-b486-4900-8854-0647e75584a3', 'beaverswork', 'team', '2026-09-24T08:39:04.98073+00:00', 'inter', null);

-- Not: user_id'ler auth.users'ta mevcut olmalı (aynı UUID ile içe aktarılmış olmalı).
insert into public.organization_members (id, org_id, user_id, role, created_at) values
  ('8b2c962d-3e7c-4178-9c07-33fe37f977f8', 'b4f6db91-b486-4900-8854-0647e75584a3', '49d14125-8488-468e-9658-e4515a5274c9', 'admin', '2026-09-24T08:39:05.337164+00:00');

insert into public.platform_admins (user_id, note, created_at) values
  ('49d14125-8488-468e-9658-e4515a5274c9', 'kurucu', '2026-09-22T21:22:47.297456+00:00');

insert into public.user_preferences (user_id, theme_font, theme_color, updated_at) values
  ('49d14125-8488-468e-9658-e4515a5274c9', null, '#a855f7', '2026-09-24T11:37:52.67+00:00');

commit;
