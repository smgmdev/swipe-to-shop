export default async function handler(req, res) {
  try {
    const {
      amount,
      orderId,
      description,
      successUrl,
      failUrl
    } = JSON.parse(req.body || "{}");

    // DEMO TINKOFF KEYS (for testing)
    const TerminalKey = "1614714816763DEMO";
    const SecretKey = "TinkoffBankTest";

    // Validate
    const cleanAmount = Number(amount);
    if (!cleanAmount || isNaN(cleanAmount)) {
      return res.status(400).json({
        error: "Invalid amount",
        received: amount
      });
    }

    const payload = {
      TerminalKey,
      Amount: Math.round(cleanAmount * 100),
      OrderId: orderId ?? "order-" + Date.now(),
      Description: description ?? "Payment",
      SuccessURL: successUrl,
      FailURL: failUrl
    };

    // Generate token
    const tokenString =
      Object.keys(payload).sort().map(k => `${k}=${payload[k]}`).join("") + SecretKey;

    const crypto = await import("crypto");
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
    return res.status(500).json({ error: err.message });
  }
}
