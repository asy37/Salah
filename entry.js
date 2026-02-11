// expo-router entry ile aynı; sadece metro-runtime'dan hemen sonra debug init çalıştırıyoruz.
// @expo/metro-runtime MUST be the first import (expo-router kuralı).
import "@expo/metro-runtime";
import "./src/lib/utils/debugLogInit";

import { App } from "expo-router/build/qualified-entry";
import { renderRootComponent } from "expo-router/build/renderRootComponent";

renderRootComponent(App);
