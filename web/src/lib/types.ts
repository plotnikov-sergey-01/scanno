export type ProductStats = {
  review_count: number;
  avg_rating: string | number;
  never_again_count: number;
  buy_again_count: number;
  neutral_count: number;
  never_again_pct: number;
  rating_distribution: Record<string, number>;
  updated_at: string;
};

export type Product = {
  id: number;
  barcode: string | null;
  name: string;
  brand: string;
  category: string;
  description?: string;
  ingredients_text?: string;
  image_url: string;
  off_id: string;
  source?: "catalog" | "user";
  created_by_id?: number | null;
  can_edit_image?: boolean;
  merged_into?: number | null;
  stats?: ProductStats;
  recent_prices?: {
    amount: string;
    currency: string;
    city: string;
    store_name: string;
    updated_at: string | null;
  }[];
  off_stores?: string[];
  period_never_again?: number;
  period_review_count?: number;
  created_at: string;
  updated_at: string;
  already_exists?: boolean;
  detail?: string;
};

export type PublicUser = {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  avatar: string | null;
};

export type ReviewImage = {
  id: number;
  image: string;
  created_at: string;
};

export type Review = {
  id: number;
  user: PublicUser;
  product_id: number;
  product_name: string;
  product_brand?: string;
  product_image_url?: string;
  rating: number;
  verdict: "buy_again" | "never_again" | "neutral";
  body: string;
  visibility: "public" | "private";
  store_name: string;
  city: string;
  price_paid?: string | number | null;
  price_currency?: string;
  tasted_at: string | null;
  images: ReviewImage[];
  comment_count?: number;
  comments?: Comment[];
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: number;
  user: PublicUser;
  body: string;
  likes: number;
  dislikes: number;
  my_reaction: "like" | "dislike" | null;
  created_at: string;
  updated_at: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type SocialProvider = "google" | "facebook" | "linkedin";

export type SocialLoginResponse = AuthTokens & {
  user: Me;
};

export type Me = {
  id: number;
  email: string;
  username: string;
  profile?: {
    display_name: string;
    bio: string;
    avatar: string | null;
    created_at: string;
    updated_at: string;
  } | null;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
