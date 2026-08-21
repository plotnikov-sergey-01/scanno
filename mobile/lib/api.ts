import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:8000/api/v1";

async function getToken() {
  return AsyncStorage.getItem("scanno_access");
}

export async function setTokens(access: string, refresh: string) {
  await AsyncStorage.setItem("scanno_access", access);
  await AsyncStorage.setItem("scanno_refresh", refresh);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove(["scanno_access", "scanno_refresh"]);
}

async function request<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || res.statusText || "Request failed");
  }
  return data as T;
}

export const api = {
  login: async (email: string, password: string) => {
    const tokens = await request<{ access: string; refresh: string }>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await setTokens(tokens.access, tokens.refresh);
    return tokens;
  },
  me: () => request("/auth/me/", {}, true),
  lookupBarcode: (barcode: string) =>
    request(`/products/lookup/`, {
      method: "POST",
      body: JSON.stringify({ barcode }),
    }, true),
  getProduct: (id: number) => request(`/products/${id}/`),
  searchProducts: (q: string) => request(`/products/?q=${encodeURIComponent(q)}`),
};
