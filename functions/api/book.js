// Cloudflare Pages Function: POST /api/book
// Emails the booking request via Resend (https://resend.com).
// Set env vars in Cloudflare Pages > Settings > Environment variables:
//   RESEND_API_KEY  - your Resend API key
//   BOOKING_TO      - where requests are sent (e.g. your inbox)
//   BOOKING_FROM    - verified sender, e.g. bookings@gettendway.com

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const d = await request.json();

    // basic validation
    const required = ['name', 'phone', 'pickup', 'destination', 'date', 'time'];
    for (const f of required) {
      if (!d[f] || String(d[f]).trim() === '') {
        return json({ error: `Missing field: ${f}` }, 400);
      }
    }

    const esc = (s) => String(s || '—').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const subject = `New Ride Request — ${esc(d.name)} (${esc(d.date)} ${esc(d.time)})`;
    const html = `
      <h2>New Tendway Ride Request</h2>
      <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif">
        <tr><td><b>Name</b></td><td>${esc(d.name)}</td></tr>
        <tr><td><b>Phone</b></td><td>${esc(d.phone)}</td></tr>
        <tr><td><b>Email</b></td><td>${esc(d.email)}</td></tr>
        <tr><td><b>Pickup</b></td><td>${esc(d.pickup)}</td></tr>
        <tr><td><b>Destination</b></td><td>${esc(d.destination)}</td></tr>
        <tr><td><b>Date</b></td><td>${esc(d.date)}</td></tr>
        <tr><td><b>Time</b></td><td>${esc(d.time)}</td></tr>
        <tr><td><b>Trip Type</b></td><td>${esc(d.triptype)}</td></tr>
        <tr><td><b>Passengers</b></td><td>${esc(d.passengers)}</td></tr>
        <tr><td><b>Notes</b></td><td>${esc(d.notes)}</td></tr>
      </table>`;

    const text = `New Tendway Ride Request
Name: ${d.name}
Phone: ${d.phone}
Email: ${d.email || '-'}
Pickup: ${d.pickup}
Destination: ${d.destination}
Date: ${d.date}
Time: ${d.time}
Trip Type: ${d.triptype || '-'}
Passengers: ${d.passengers || '-'}
Notes: ${d.notes || '-'}`;

    if (!env.RESEND_API_KEY || !env.BOOKING_TO || !env.BOOKING_FROM) {
      // Misconfigured — fail loudly so the form shows the call-us fallback.
      return json({ error: 'Email not configured' }, 500);
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Tendway Bookings <${env.BOOKING_FROM}>`,
        to: [env.BOOKING_TO],
        reply_to: d.email || undefined,
        subject,
        html,
        text,
      }),
    });

    if (!r.ok) {
      const body = await r.text();
      return json({ error: 'Send failed', detail: body }, 502);
    }
    return json({ ok: true }, 200);
  } catch (err) {
    return json({ error: 'Bad request', detail: String(err) }, 400);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
