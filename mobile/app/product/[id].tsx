import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../lib/api";

type Product = {
  id: number;
  name: string;
  brand: string;
  barcode: string | null;
  image_url: string;
  stats?: {
    avg_rating: number | string;
    review_count: number;
    never_again_pct: number;
  };
};

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .getProduct(Number(id))
      .then((p) => setProduct(p as Product))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [id]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!product) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const avg = Number(product.stats?.avg_rating || 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.meta}>{product.brand}</Text>
      {product.barcode ? <Text style={styles.barcode}>{product.barcode}</Text> : null}
      {product.stats && product.stats.review_count > 0 ? (
        <Text style={styles.stats}>
          {avg.toFixed(1)} ★ · {product.stats.review_count} reviews ·{" "}
          {product.stats.never_again_pct}% never again
        </Text>
      ) : (
        <Text style={styles.stats}>No reviews yet — open the web app to add one.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  image: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#e8eef6" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#0f1b2d", marginTop: 12 },
  meta: { fontSize: 16, color: "#243447" },
  barcode: { fontFamily: "monospace", color: "#6b7c93" },
  stats: { marginTop: 8, fontSize: 15, color: "#243447" },
  error: { color: "#e85d4c" },
});
