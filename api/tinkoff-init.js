export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // VERCEL: req.body is ALREADY a parsed object
    const { amount, orderId, description, successUrl, failUrl } = req.body || {};

    // DEMO KEYS (works only in DEMO Tinkoff sandbox)
    const TerminalKey = "1614714816763DEMO";
    const SecretKey = "TinkoffBankTest";

    if (!amount) {
      return res.status(400).json({ error: "Amount missing" });
    }

    const cleanAmount = Number(amount);
    if (isNaN(cleanAmount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const payload = {
      TerminalKey,
      Amount: Math.round(cleanAmount * 100),
      OrderId: orderId ?? "order-" + Date.now(),
      Description: description ?? "Payment",
      SuccessURL: successUrl,
      FailURL: failUrl,
    };

    // Generate token
    const crypto = await import("crypto");
    const tokenString =
      Object.keys(payload).sort().map(k => `${k}=${payload[k]}`).join("") + SecretKey;

    payload.Token = crypto.createHash("sha256").update(tokenString).digest("hex");

    // Send to Tinkoff
    const tinkoffResponse = await fetch("https://securepay.tinkoff.ru/v2/Init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await tinkoffResponse.json();

    if (!data.Success) {
      return res.status(400).json(data);
    }

    return res.status(200).json({ url: data.PaymentURL });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
