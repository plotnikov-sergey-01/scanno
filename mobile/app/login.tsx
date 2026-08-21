import { useState } from "react";
import { View, TextInput, Pressable, Text, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { api } from "../lib/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setLoading(true);
    try {
      await api.login(email.trim(), password);
      router.replace("/scan");
    } catch (e) {
      Alert.alert("Login failed", e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} onPress={onLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "…" : "Log in"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e8eef6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    backgroundColor: "#00b4ef",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
