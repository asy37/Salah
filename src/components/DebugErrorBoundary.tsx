import React from "react";
import { Text, View } from "react-native";
import { debugLog } from "@/lib/utils/debugLog";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class DebugErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    debugLog("DebugErrorBoundary", "componentDidCatch", {
      message: error.message,
      stack: error.stack ?? "",
      componentStack: info.componentStack ?? "",
    });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={{ flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#1a1a1a" }}>
          <Text style={{ color: "#fff", fontSize: 16, marginBottom: 8 }}>Uygulama hatası (debug):</Text>
          <Text style={{ color: "#f88", fontSize: 12 }} selectable>
            {this.state.error.message}
          </Text>
          <Text style={{ color: "#888", fontSize: 10, marginTop: 16 }} selectable>
            Log: adb shell run-as com.islamicapp.app cat /data/data/com.islamicapp.app/files/islamic_app_debug.log
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}
