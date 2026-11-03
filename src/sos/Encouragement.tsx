import React from "react";
import { AccessibilityInfo, Animated, Text, View } from "react-native";
/** Show complete sentences long enough to read; never expose half-typed words. */
export function Encouragement({
  messages,
  color = "#f3f3ed",
}: {
  messages: string[];
  color?: string;
}) {
  const key = messages.join("\n");
  const [reduce, setReduce] = React.useState(true);
  const [text, setText] = React.useState(messages[0] ?? "");
  const [full, setFull] = React.useState(messages[0] ?? "");
  const opacity = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    let disposed = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!disposed) setReduce(value);
    });
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => {
      disposed = true;
      listener.remove();
    };
  }, []);
  React.useEffect(() => {
    const lines = [...new Set(key.split("\n").filter(Boolean))];
    if (!lines.length) return;
    let disposed = false,
      index = 0;
    let timer: ReturnType<typeof setTimeout>;
    let animation: Animated.CompositeAnimation | undefined;
    opacity.setValue(1);
    setText(lines[0]);
    setFull(lines[0]);
    const schedule = () => {
      timer = setTimeout(next, Math.max(6500, lines[index].length * 55));
    };
    const next = () => {
      if (disposed) return;
      index = (index + 1) % lines.length;
      const line = lines[index];
      if (reduce) {
        setFull(line);
        setText(line);
        schedule();
        return;
      }
      animation = Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      });
      animation.start(({ finished }) => {
        if (disposed || !finished) return;
        setFull(line);
        setText(line);
        animation = Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        });
        animation.start(() => {
          if (!disposed) schedule();
        });
      });
    };
    if (lines.length > 1) schedule();
    return () => {
      disposed = true;
      clearTimeout(timer);
      animation?.stop();
    };
  }, [key, reduce, opacity]);
  return (
    <View
      accessible
      accessibilityLabel={full}
      style={{ minHeight: 76, justifyContent: "center" }}
    >
      <Animated.View accessible={false} style={{ opacity }}>
        <Text
          accessible={false}
          style={{ color, fontSize: 18, lineHeight: 25, textAlign: "center" }}
        >
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}
