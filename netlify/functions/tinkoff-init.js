import config from "./config.json" assert { type: "json" };

export async function handler(event) {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing request body" })
      };
    }

    const body = JSON.parse(event.body);

    const TerminalKey = config.TerminalKey;
    const SecretKey = config.SecretKey;

    if (!TerminalKey || !SecretKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing TerminalKey or SecretKey in config.json" })
      };
    }

    const cleanAmount = Number(body.amount);
    if (!cleanAmount || isNaN(cleanAmount)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid amount (must be numeric)",
          received: body.amount
        })
      };
    }

    const Amount = Math.round(cleanAmount * 100);

    const payload = {
      TerminalKey,
      Amount,
      OrderId: body.orderId || "order-" + Date.now(),
      Description: body.description || "Payment",
      SuccessURL: body.successUrl || "https://example.com/success",
      FailURL: body.failUrl || "https://example.com/fail"
    };

    // Remove undefined fields
    Object.keys(payload).forEach(
      key => (payload[key] === undefined || payload[key] === null) && delete payload[key]
    );

    // Token generation
    const crypto = await import("crypto");
    const tokenString =
      Object.keys(payload)
        .sort()
        .map(key => `${key}=${payload[key]}`)
        .join("") + SecretKey;

    const Token = crypto
      .createHash("sha256")
      .update(tokenString)
      .digest("hex");

    payload.Token = Token;

    // DEMO endpoint (NOT production)
    const TINKOFF_URL = "https://rest-api-test.tinkoff.ru/v2/Init";

    const response = await fetch(TINKOFF_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    // Tinkoff may return HTML on error → catch it
    try {
      const json = JSON.parse(text);

      return {
        statusCode: 200,
        body: JSON.stringify(json)
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Tinkoff returned non-JSON response",
          raw: text
        })
      };
    }

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
