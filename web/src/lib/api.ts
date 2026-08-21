import type { AuthTokens, Me, Paginated, Product, Review } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("scanno_access");
}

export function setTokens(tokens: AuthTokens) {
  localStorage.setItem("scanno_access", tokens.access);
  localStorage.setItem("scanno_refresh", tokens.refresh);
}

export function clearTokens() {
  localStorage.removeItem("scanno_access");
  localStorage.removeItem("scanno_refresh");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail =
      typeof data === "object" && data && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : res.statusText || "Request failed";
    throw new ApiError(detail, res.status, data);
  }
  return data as T;
}

export const api = {
  register: (body: { email: string; username: string; password: string; display_name?: string }) =>
    request<Me>("/auth/register/", { method: "POST", body: JSON.stringify(body) }),

  login: async (email: string, password: string) => {
    const tokens = await request<AuthTokens>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setTokens(tokens);
    return tokens;
  },

  me: () => request<Me>("/auth/me/", {}, true),

  getProduct: (id: number) => request<Product>(`/products/${id}/`, {}, true),

  lookupBarcode: (barcode: string) =>
    request<Product>("/products/lookup/", {
      method: "POST",
      body: JSON.stringify({ barcode }),
    }, true),

  searchProducts: (q: string) =>
    request<Paginated<Product>>(`/products/?q=${encodeURIComponent(q)}`, {}, true),

  createProduct: (body: Partial<Product>) =>
    request<Product>("/products/", { method: "POST", body: JSON.stringify(body) }, true),

  updateProduct: (id: number, body: Partial<Product>) =>
    request<Product>(`/products/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }, true),

  uploadProductImage: (productId: number, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return request<Product>(`/products/${productId}/image/`, { method: "POST", body: form }, true);
  },

  productReviews: (productId: number) =>
    request<Paginated<Review>>(`/products/${productId}/reviews/`),

  createReview: (productId: number, body: Record<string, unknown>) =>
    request<Review>(`/products/${productId}/reviews/`, {
      method: "POST",
      body: JSON.stringify(body),
    }, true),

  updateReview: (reviewId: number, body: Record<string, unknown>) =>
    request<Review>(`/reviews/${reviewId}/`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }, true),

  getReview: (reviewId: number) => request<Review>(`/reviews/${reviewId}/`, {}, true),

  discover: (feed: string, params?: { days?: number; limit?: number }) => {
    const qs = new URLSearchParams({ feed });
    if (params?.days) qs.set("days", String(params.days));
    if (params?.limit) qs.set("limit", String(params.limit));
    return request<{ feed: string; days?: number; results: unknown[] }>(`/discover/?${qs}`);
  },

  browse: (params?: Record<string, string>) => {
    const qs = new URLSearchParams(params || {});
    return request<Paginated<Product>>(`/browse/?${qs}`);
  },

  myReviews: (params?: { verdict?: string }) => {
    const qs = new URLSearchParams();
    if (params?.verdict) qs.set("verdict", params.verdict);
    const query = qs.toString();
    return request<Paginated<Review>>(`/reviews/me/${query ? `?${query}` : ""}`, {}, true);
  },

  uploadReviewImage: (reviewId: number, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return request(`/reviews/${reviewId}/images/`, { method: "POST", body: form }, true);
  },

  addComment: (reviewId: number, body: string) =>
    request(`/reviews/${reviewId}/comments/`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }, true),

  getUser: (username: string) => request(`/users/${username}/`),

  getUserReviews: (username: string) =>
    request<Paginated<Review>>(`/users/${username}/reviews/`),

  report: (payload: { target_type: string; target_id: number; reason: string; details?: string }) =>
    request("/reports/", { method: "POST", body: JSON.stringify(payload) }, true),
};
