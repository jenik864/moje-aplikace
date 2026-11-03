import React from "react";
import { Image, View } from "react-native";
export function AttentionArtwork({
  size = 180,
  quiet = false,
}: {
  size?: number;
  quiet?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        borderRadius: size / 2,
        opacity: quiet ? 0.55 : 1,
      }}
    >
      <Image
        accessible={false}
        source={require("../../assets/attention/phone.png")}
        resizeMode="cover"
        style={{ width: size, height: size }}
      />
    </View>
  );
}
