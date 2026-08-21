import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { api } from "../lib/api";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState(false);

  async function lookup(code: string) {
    if (busy) return;
    setBusy(true);
    try {
      const product = (await api.lookupBarcode(code.trim())) as { id: number };
      router.push(`/product/${product.id}`);
    } catch (e) {
      Alert.alert("Lookup failed", e instanceof Error ? e.message : "Log in first or try again");
    } finally {
      setBusy(false);
      setScanned(false);
    }
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera access is needed to scan barcodes.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </Pressable>
        <Text style={styles.or}>Or enter barcode manually</Text>
        <ManualLookup value={manual} onChange={setManual} onSubmit={() => lookup(manual)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                lookup(data);
              }
        }
      />
      <View style={styles.overlay}>
        <Text style={styles.hint}>{busy ? "Looking up…" : "Point at a barcode"}</Text>
        <ManualLookup value={manual} onChange={setManual} onSubmit={() => lookup(manual)} />
      </View>
    </View>
  );
}

function ManualLookup({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.manualRow}>
      <TextInput
        style={styles.input}
        placeholder="Barcode"
        keyboardType="number-pad"
        value={value}
        onChangeText={onChange}
      />
      <Pressable style={styles.button} onPress={onSubmit}>
        <Text style={styles.buttonText}>Go</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1b2d" },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "rgba(15,27,45,0.85)",
    gap: 10,
  },
  hint: { color: "#fff", textAlign: "center", fontWeight: "600" },
  text: { color: "#fff", padding: 24, textAlign: "center" },
  or: { color: "#e8eef6", textAlign: "center", marginVertical: 12 },
  manualRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: "#00b4ef",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
