// api/tinkoff-init.js
import crypto from "crypto";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // --- Body parsing: Vercel does NOT parse JSON for non-Next.js apps ---
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
    }

    const { amount, orderId, description, successUrl, failUrl } =
      raw ? JSON.parse(raw) : {};

    if (!amount) {
      return res.status(400).json({ error: "Amount missing" });
    }

    // DEMO KEYS
    const TerminalKey = "1614714816763DEMO";
    const SecretKey = "TinkoffBankTest";

    const cleanAmount = Number(amount);
    if (isNaN(cleanAmount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // DEMO PAYLOAD
    const payload = {
      TerminalKey,
      Amount: Math.round(cleanAmount * 100),
      OrderId: orderId || "order-" + Date.now(),
      Description: description || "Payment",
      SuccessURL: successUrl,
      FailURL: failUrl,
    };

    // DEMO SIGNATURE — EXACT FORM REQUIRED
    const tokenString =
      payload.OrderId +
      payload.Amount +
      payload.TerminalKey +
      SecretKey;

    payload.Token = crypto
      .createHash("sha256")
      .update(tokenString)
      .digest("hex");

    // SEND TO TINKOFF
    const response = await fetch("https://securepay.tinkoff.ru/v2/Init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data.Success) {
      return res.status(400).json({ tinkoff: data, payload });
    }

    return res.status(200).json({ url: data.PaymentURL });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
