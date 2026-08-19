import crypto from "crypto";

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

function createSecretKey(botToken) {
  return crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
}

function createDataCheckString(params) {
  return [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function calculateHash(dataCheckString, secretKey) {
  return crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
}

function safeCompareHashes(hashA, hashB) {
  if (!hashA || !hashB) {
    return false;
  }

  const a = Buffer.from(hashA, "hex");
  const b = Buffer.from(hashB, "hex");

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

export function validateTelegramInitData(initData) {
  if (!initData || typeof initData !== "string") {
    throw new Error("Telegram initData bulunamadı.");
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN ortam değişkeni bulunamadı."
    );
  }

  const params = new URLSearchParams(initData);

  const receivedHash = params.get("hash");

  if (!receivedHash) {
    throw new Error(
      "Telegram doğrulama hash bilgisi bulunamadı."
    );
  }

  const authDate = Number(params.get("auth_date"));

  if (!Number.isFinite(authDate)) {
    throw new Error(
      "Telegram auth_date bilgisi geçersiz."
    );
  }

  const currentTime = Math.floor(
    Date.now() / 1000
  );

  if (
    currentTime - authDate >
    MAX_AUTH_AGE_SECONDS
  ) {
    throw new Error(
      "Telegram oturum bilgisi süresi dolmuş."
    );
  }

  if (authDate > currentTime + 60) {
    throw new Error(
      "Telegram auth_date gelecekte olamaz."
    );
  }

  const dataCheckString =
    createDataCheckString(params);

  const secretKey = createSecretKey(botToken);

  const calculatedHash = calculateHash(
    dataCheckString,
    secretKey
  );

  if (
    !safeCompareHashes(
      calculatedHash,
      receivedHash
    )
  ) {
    throw new Error(
      "Telegram initData doğrulaması başarısız."
    );
  }

  const userData = params.get("user");

  if (!userData) {
    throw new Error(
      "Telegram kullanıcı bilgisi bulunamadı."
    );
  }

  let user;

  try {
    user = JSON.parse(userData);
  } catch {
    throw new Error(
      "Telegram kullanıcı bilgisi geçersiz."
    );
  }

  if (!user?.id) {
    throw new Error(
      "Telegram kullanıcı ID bilgisi bulunamadı."
    );
  }

  return {
    user,
    authDate,
    queryId: params.get("query_id"),
  };
}

export default validateTelegramInitData;