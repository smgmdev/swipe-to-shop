import config from "./config.json";

export async function handler(event) {
  try {
    const body = JSON.parse(event.body);

    const TerminalKey = config.TerminalKey;
    const SecretKey = config.SecretKey;

    const payload = {
      TerminalKey,
      Amount: Math.round(body.amount * 100),
      OrderId: "order-" + Date.now(),
      Description: body.description,
      SuccessURL: body.successUrl,
      FailURL: body.failUrl,
    };

    const tokenString =
      Object.keys(payload)
        .sort()
        .map((key) => `${key}=${payload[key]}`)
        .join("") + SecretKey;

    const crypto = await import("crypto");
    const Token = crypto.createHash("sha256").update(tokenString).digest("hex");

    payload.Token = Token;

    const response = await fetch("https://securepay.tinkoff.ru/v2/Init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!json.Success) {
      return {
        statusCode: 400,
        body: JSON.stringify(json),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: json.PaymentURL }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
