-- Schedules the check-plans edge function to run daily, re-scoring weather
-- for upcoming plans and sending push notifications when conditions worsen.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'daily-weather-check',
  '0 7 * * *', -- 07:00 UTC daily
  $$
  select net.http_post(
    url := 'https://fxgdxwlfsubnjgopkqau.supabase.co/functions/v1/check-plans',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
