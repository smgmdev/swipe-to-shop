export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { amount, orderId, description, successUrl, failUrl } = req.body || {};
    if (!amount) return res.status(400).json({ error: "Amount missing" });

    const cleanAmount = Number(amount);
    if (isNaN(cleanAmount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // DEMO KEYS
    const TerminalKey = "1614714816763DEMO";
    const SecretKey   = "TinkoffBankTest";

    const payload = {
      TerminalKey,
      Amount: Math.round(cleanAmount * 100),
      OrderId: orderId || ("order-" + Date.now()),
      Description: description || "Payment",
      SuccessURL: successUrl,
      FailURL: failUrl,
    };

    // DEMO SIGNATURE:
    // sha256(OrderId + Amount + TerminalKey + SecretKey)
    const crypto = await import("crypto");
    const tokenString =
      payload.OrderId +
      payload.Amount +
      payload.TerminalKey +
      SecretKey;

    payload.Token = crypto
      .createHash("sha256")
      .update(tokenString)
      .digest("hex");

    const tinkoffResponse = await fetch("https://securepay.tinkoff.ru/v2/Init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await tinkoffResponse.json();

    if (!data.Success) {
      return res.status(400).json({ tinkoff: data, payload });
    }

    return res.status(200).json({ url: data.PaymentURL });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
