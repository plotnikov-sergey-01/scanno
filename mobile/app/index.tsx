import { Link } from "expo-router";
import { StyleSheet, Text, View, Pressable } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Scanno</Text>
      <Text style={styles.tagline}>Scan it before you buy it again.</Text>
      <Link href="/scan" asChild>
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>Open scanner</Text>
        </Pressable>
      </Link>
      <Link href="/login" asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>Log in</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  brand: { fontSize: 42, fontWeight: "800", color: "#0f1b2d" },
  tagline: { marginTop: 8, fontSize: 18, color: "#243447", marginBottom: 32 },
  primary: {
    backgroundColor: "#00b4ef",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondary: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8eef6",
    backgroundColor: "#fff",
  },
  secondaryText: { color: "#0f1b2d", fontWeight: "600" },
});
