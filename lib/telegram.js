"use client";

export function getTelegramWebApp() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp || null;
}

export function initTelegramWebApp() {
  const telegram = getTelegramWebApp();

  if (!telegram) {
    return null;
  }

  telegram.ready();
  telegram.expand();

  return telegram;
}

export function getTelegramInitData() {
  const telegram = getTelegramWebApp();

  return telegram?.initData || "";
}

export function getTelegramUser() {
  const telegram = getTelegramWebApp();

  return telegram?.initDataUnsafe?.user || null;
}

export function showTelegramAlert(message) {
  const telegram = getTelegramWebApp();

  if (
    telegram &&
    typeof telegram.showAlert === "function"
  ) {
    telegram.showAlert(String(message));
    return;
  }

  if (typeof window !== "undefined") {
    window.alert(String(message));
  }
}

export function showTelegramConfirm(
  message,
  callback
) {
  const telegram = getTelegramWebApp();

  if (
    telegram &&
    typeof telegram.showConfirm === "function"
  ) {
    telegram.showConfirm(
      String(message),
      callback
    );

    return;
  }

  if (typeof window !== "undefined") {
    const confirmed = window.confirm(
      String(message)
    );

    if (typeof callback === "function") {
      callback(confirmed);
    }
  }
}

export function closeTelegramWebApp() {
  const telegram = getTelegramWebApp();

  if (
    telegram &&
    typeof telegram.close === "function"
  ) {
    telegram.close();
  }
}

export function hapticFeedback(
  type = "light"
) {
  const telegram = getTelegramWebApp();

  const haptic =
    telegram?.HapticFeedback;

  if (!haptic) {
    return;
  }

  if (
    type === "success" ||
    type === "error" ||
    type === "warning"
  ) {
    haptic.notificationOccurred(type);
    return;
  }

  if (
    type === "medium" ||
    type === "heavy" ||
    type === "rigid" ||
    type === "soft"
  ) {
    haptic.impactOccurred(type);
    return;
  }

  haptic.impactOccurred("light");
}

export function getTelegramColorScheme() {
  const telegram = getTelegramWebApp();

  return telegram?.colorScheme || "light";
}

export function isTelegramWebApp() {
  return Boolean(getTelegramWebApp());
}