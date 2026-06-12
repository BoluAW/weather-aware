// Deno edge function — runs on a daily cron schedule via Supabase
// Checks all plans in the next 48 hours, scores weather, sends push alerts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

type ActivityType = 'trip' | 'outdoor_event' | 'laundry' | 'workout' | 'market_run';
type Verdict = 'green' | 'amber' | 'red';

const RULES: Record<ActivityType, { red: Record<string, number>; amber: Record<string, number> }> = {
  trip:          { red: { precipitation: 3, windspeed: 40, maxTemp: 40, minTemp: -5 }, amber: { precipitation: 1, windspeed: 25 } },
  outdoor_event: { red: { precipitation: 0.5, windspeed: 30 }, amber: { precipitation: 0.1, windspeed: 20 } },
  laundry:       { red: { precipitation: 0.1, humidity: 80 }, amber: { precipitation: 0.05 } },
  workout:       { red: { precipitation: 1, maxTemp: 35, windspeed: 40 }, amber: { precipitation: 0.5, windspeed: 25 } },
  market_run:    { red: { precipitation: 5, windspeed: 50 }, amber: { precipitation: 2, windspeed: 35 } },
};

function scoreWeather(hourly: Record<string, number[]>, activityType: ActivityType, date: string, time: string): Verdict {
  const start = new Date(`${date}T${time}`).getTime();
  const end = start + 4 * 3_600_000;

  const indices: number[] = [];
  (hourly.time as unknown as string[]).forEach((t: string, i: number) => {
    const dt = new Date(t).getTime();
    if (dt >= start && dt <= end) indices.push(i);
  });

  const pick = (key: string) => indices.map((i) => hourly[key][i]);
  const maxOf = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
  const minOf = (arr: number[]) => arr.length ? Math.min(...arr) : 0;

  const maxPrecip = maxOf(pick('precipitation'));
  const maxWind = maxOf(pick('windspeed_10m'));
  const maxTemp = maxOf(pick('temperature_2m'));
  const minTemp = minOf(pick('temperature_2m'));
  const maxHumidity = maxOf(pick('relativehumidity_2m'));

  const { red, amber } = RULES[activityType];

  if (red.precipitation !== undefined && maxPrecip > red.precipitation) return 'red';
  if (red.windspeed !== undefined && maxWind > red.windspeed) return 'red';
  if (red.maxTemp !== undefined && maxTemp > red.maxTemp) return 'red';
  if (red.minTemp !== undefined && minTemp < red.minTemp) return 'red';
  if (red.humidity !== undefined && maxHumidity > red.humidity) return 'red';
  if (amber.precipitation !== undefined && maxPrecip > amber.precipitation) return 'amber';
  if (amber.windspeed !== undefined && maxWind > amber.windspeed) return 'amber';

  return 'green';
}

function buildMessage(verdict: Verdict, planName: string): string {
  if (verdict === 'red') return `⛔ "${planName}" is at high risk — bad weather expected. Consider rescheduling.`;
  return `⚠️ Heads up: weather may affect "${planName}". Keep an eye on the forecast.`;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 3_600_000);
  const todayStr = now.toISOString().split('T')[0];
  const in48hStr = in48h.toISOString().split('T')[0];

  const { data: plans, error } = await supabase
    .from('plans')
    .select('*, users(expo_push_token)')
    .gte('date', todayStr)
    .lte('date', in48hStr)
    .is('notified_at', null);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!plans || plans.length === 0) return new Response('No plans to check.', { status: 200 });

  for (const plan of plans) {
    const params = new URLSearchParams({
      latitude: plan.latitude.toString(),
      longitude: plan.longitude.toString(),
      hourly: 'precipitation,windspeed_10m,temperature_2m,relativehumidity_2m',
      timezone: 'auto',
      forecast_days: '3',
    });

    const forecastRes = await fetch(`${OPEN_METEO}?${params}`);
    if (!forecastRes.ok) continue;
    const { hourly } = await forecastRes.json();

    const verdict = scoreWeather(hourly, plan.activity_type as ActivityType, plan.date, plan.time);

    await supabase
      .from('plans')
      .update({ weather_verdict: verdict })
      .eq('id', plan.id);

    if (verdict === 'green') continue;

    const token = plan.users?.expo_push_token;
    const message = buildMessage(verdict, plan.name);

    if (token) {
      await fetch(EXPO_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: token,
          title: verdict === 'red' ? 'Weather Alert ⛔' : 'Weather Heads-up ⚠️',
          body: message,
          data: { planId: plan.id },
        }),
      });
    }

    await supabase.from('notifications_log').insert({
      plan_id: plan.id,
      user_id: plan.user_id,
      verdict,
      message,
    });

    await supabase
      .from('plans')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', plan.id);
  }

  return new Response(`Checked ${plans.length} plans.`, { status: 200 });
});
