// /api/tinkoff-init.js — WORKING VERCEL API (CommonJS)

const crypto = require("crypto");

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, orderId, description, successUrl, failUrl } = req.body || {};

    if (!amount) {
      return res.status(400).json({ error: "Amount missing" });
    }

    const TerminalKey = "1614714816763DEMO";
    const SecretKey = "TinkoffBankTest";

    const cleanAmount = Number(amount);
    if (isNaN(cleanAmount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const payload = {
      TerminalKey,
      Amount: Math.round(cleanAmount * 100),
      OrderId: orderId || "order-" + Date.now(),
      Description: description || "Payment",
      SuccessURL: successUrl,
      FailURL: failUrl,
    };

    // DEMO SIGNATURE RULE
    const tokenString =
      payload.OrderId + payload.Amount + payload.TerminalKey + SecretKey;

    payload.Token = crypto.createHash("sha256").update(tokenString).digest("hex");

    // SEND TO TINKOFF DEMO
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
};
