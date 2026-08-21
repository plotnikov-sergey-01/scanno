import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#f4f7fb" },
          headerTintColor: "#0f1b2d",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#f4f7fb" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Scanno" }} />
        <Stack.Screen name="login" options={{ title: "Log in" }} />
        <Stack.Screen name="scan" options={{ title: "Scan barcode" }} />
        <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
      </Stack>
    </>
  );
}
