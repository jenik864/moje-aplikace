import { requireOptionalNativeModule } from "expo-modules-core";
import type { UsageDay } from "./scoring";
export const usageNative = requireOptionalNativeModule<{
  hasPermission(): Promise<boolean>;
  openSettings(): Promise<void>;
  readUsage(): Promise<UsageDay[]>;
}>("QuitterUsage");
