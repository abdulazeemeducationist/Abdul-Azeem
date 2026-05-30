import React, { useState } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import Colors from "@/constants/colors";

interface QuestionBodyProps {
  questionText?: string | null;
  questionHtml?: string | null;
  questionImageUrl?: string | null;
  /** When true the parent card has no padding — used for image questions */
  imageFill?: boolean;
}

function makeHtmlDoc(body: string) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;line-height:1.6;color:#111827;background:transparent;word-break:break-word}
table{border-collapse:collapse;width:100%;margin:6px 0}
td,th{border:1px solid #d1d5db;padding:6px 10px;font-size:14px}
th{background:#f3f4f6;font-weight:600}
sub,sup{font-size:0.75em}
strong,b{font-weight:700}
em,i{font-style:italic}
p{margin-bottom:6px}
</style>
</head><body>${body}
<script>
function postHeight(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'height',h:document.body.scrollHeight}))}
window.addEventListener('load',postHeight);
setTimeout(postHeight,200);
</script>
</body></html>`;
}

function NativeHtmlView({ html }: { html: string }) {
  const [height, setHeight] = useState(80);
  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html: makeHtmlDoc(html) }}
      style={{ height, backgroundColor: "transparent" }}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      onMessage={e => {
        try {
          const d = JSON.parse(e.nativeEvent.data);
          if (d.type === "height" && d.h > 0) setHeight(d.h + 8);
        } catch {}
      }}
    />
  );
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/** Returns true when the question uses an image as its body */
export function isImageQuestion(q: { questionImageUrl?: string | null }): boolean {
  return !!q?.questionImageUrl;
}

function ImageQuestion({ uri }: { uri: string }) {
  const { width: screenWidth } = useWindowDimensions();
  const [imgHeight, setImgHeight] = useState<number | null>(null);

  const handleLoad = (e: any) => {
    const { width: nW, height: nH } = e.nativeEvent?.source ?? {};
    if (nW && nH) {
      setImgHeight(Math.round((screenWidth * nH) / nW));
    }
  };

  return (
    <Image
      source={{ uri }}
      style={[
        styles.image,
        imgHeight !== null ? { height: imgHeight } : { height: undefined, aspectRatio: 4 / 3 },
      ]}
      resizeMode="contain"
      onLoad={handleLoad}
    />
  );
}

export default function QuestionBody({ questionText, questionHtml, questionImageUrl }: QuestionBodyProps) {
  const hasHtml = !!questionHtml && stripHtml(questionHtml).length > 0;
  const hasImage = !!questionImageUrl;
  const hasText = !!questionText?.trim();

  if (hasImage) {
    return (
      <View style={styles.imageWrapper}>
        <ImageQuestion uri={questionImageUrl!} />
        {hasText && (
          <Text style={[styles.text, { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 10 }]}>
            {questionText}
          </Text>
        )}
      </View>
    );
  }

  if (hasHtml) {
    if (Platform.OS === "web") {
      return (
        <div
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 16,
            lineHeight: "1.6",
            color: Colors.light.text,
            wordBreak: "break-word",
          } as React.CSSProperties}
          dangerouslySetInnerHTML={{ __html: questionHtml! }}
        />
      );
    }
    return <NativeHtmlView html={questionHtml!} />;
  }

  return <Text style={styles.text}>{questionText ?? ""}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
    lineHeight: 26,
  },
  imageWrapper: {
    width: "100%",
  },
  image: {
    width: "100%",
    borderRadius: 0,
  },
});
