const limits = {
  name: 80,
  contact: 120,
  products: 1000,
  delivery: 20,
  date: 20,
  comment: 1500,
  website: 200,
};

const recentRequests = new Map();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function text(value, field) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, limits[field]);
}

function escapeHtml(value) {
  return value.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]);
}

function validDate(value) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12_000) return json({ ok: false }, 413);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const previous = recentRequests.get(ip) || 0;
  if (now - previous < 15_000) return json({ ok: false }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }

  const order = {
    name: text(body.name, "name"),
    contact: text(body.contact, "contact"),
    products: text(body.products, "products"),
    delivery: text(body.delivery, "delivery"),
    date: text(body.date, "date"),
    comment: text(body.comment, "comment"),
    website: text(body.website, "website"),
  };

  if (order.website) return json({ ok: true });
  if (!order.name || !order.contact || !order.products) return json({ ok: false }, 400);
  if (!['Самовывоз', 'Доставка'].includes(order.delivery) || !validDate(order.date)) return json({ ok: false }, 400);
  if (!env.BOT_TOKEN || !env.OWNER_CHAT_ID) return json({ ok: false }, 503);

  const timestamp = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Moscow",
  }).format(new Date());

  const lines = [
    "🛒 <b>Новая заявка с сайта</b>",
    "",
    `<b>Имя:</b> ${escapeHtml(order.name)}`,
    `<b>Контакт:</b> ${escapeHtml(order.contact)}`,
    `<b>Заказ:</b> ${escapeHtml(order.products)}`,
    `<b>Получение:</b> ${escapeHtml(order.delivery)}`,
  ];
  if (order.date) lines.push(`<b>Желаемая дата:</b> ${escapeHtml(order.date)}`);
  if (order.comment) lines.push(`<b>Комментарий:</b> ${escapeHtml(order.comment)}`);
  lines.push("", `<b>Дата и время:</b> ${escapeHtml(timestamp)}`);

  const telegramResponse = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.OWNER_CHAT_ID,
      text: lines.join("\n"),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!telegramResponse.ok) return json({ ok: false }, 502);
  recentRequests.set(ip, now);
  if (recentRequests.size > 500) recentRequests.clear();
  return json({ ok: true });
}

export function onRequest() {
  return json({ ok: false }, 405);
}
