import React, { useState } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import Colors from "@/constants/colors";

interface QuestionBodyProps {
  questionText?: string | null;
  questionHtml?: string | null;
  questionImageUrl?: string | null;
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

export function isImageQuestion(q: { questionImageUrl?: string | null }): boolean {
  return !!q?.questionImageUrl;
}

/**
 * Renders an image with automatic whitespace trimming using an HTML5 canvas.
 * Scans pixel data at reduced scale, finds bounds of non-white content,
 * crops the image, and displays it edge-to-edge with only PAD_PX of breathing room.
 */
function AutoCropImage({ uri }: { uri: string }) {
  const [height, setHeight] = useState(160);

  // PAD_PX is the number of px to keep around the detected content
  const PAD_PX = 6;

  const html = `<!DOCTYPE html><html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff;overflow:hidden}
canvas{display:block;width:100%;height:auto;image-rendering:high-quality}
</style>
</head>
<body>
<canvas id="out"></canvas>
<script>
(function(){
  var PAD = ${PAD_PX};
  var THRESHOLD = 242; // pixels brighter than this on all channels are "white"

  function isLight(d, x, y, w) {
    var i = (y * w + x) * 4;
    return d[i] >= THRESHOLD && d[i+1] >= THRESHOLD && d[i+2] >= THRESHOLD;
  }

  var img = new Image();
  img.onload = function() {
    var sw = img.naturalWidth, sh = img.naturalHeight;
    if (!sw || !sh) return fallback();

    // ── 1. Draw at reduced scale for fast pixel analysis ──────────────────
    var scale = Math.min(1, 800 / sw);
    var aw = Math.max(1, Math.round(sw * scale));
    var ah = Math.max(1, Math.round(sh * scale));

    var tmp = document.createElement('canvas');
    tmp.width = aw; tmp.height = ah;
    var ctx = tmp.getContext('2d');
    ctx.drawImage(img, 0, 0, aw, ah);
    var d = ctx.getImageData(0, 0, aw, ah).data;

    // ── 2. Scan for content bounds ─────────────────────────────────────────
    var top = 0, bot = ah - 1, lft = 0, rgt = aw - 1;
    outer: for (var y = 0; y < ah; y++) for (var x = 0; x < aw; x++) { if (!isLight(d, x, y, aw)) { top = y; break outer; } }
    outer: for (var y = ah - 1; y >= 0; y--) for (var x = 0; x < aw; x++) { if (!isLight(d, x, y, aw)) { bot = y; break outer; } }
    outer: for (var x = 0; x < aw; x++) for (var y = top; y <= bot; y++) { if (!isLight(d, x, y, aw)) { lft = x; break outer; } }
    outer: for (var x = aw - 1; x >= 0; x--) for (var y = top; y <= bot; y++) { if (!isLight(d, x, y, aw)) { rgt = x; break outer; } }

    // ── 3. Scale crop coords back to original + add padding ───────────────
    var oTop = Math.max(0,    Math.round(top / scale) - PAD);
    var oBot = Math.min(sh-1, Math.round(bot / scale) + PAD);
    var oLft = Math.max(0,    Math.round(lft / scale) - PAD);
    var oRgt = Math.min(sw-1, Math.round(rgt / scale) + PAD);

    var cw = oRgt - oLft + 1;
    var ch = oBot - oTop + 1;

    // ── 4. Draw cropped image to output canvas ─────────────────────────────
    var out = document.getElementById('out');
    out.width = cw; out.height = ch;
    out.getContext('2d').drawImage(img, oLft, oTop, cw, ch, 0, 0, cw, ch);

    // ── 5. Report display height to React Native ──────────────────────────
    var dh = Math.ceil(window.innerWidth * ch / cw) + 2;
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'h', h: dh })
    );
  };

  img.onerror = fallback;

  function fallback() {
    // If canvas fails, display the image as-is
    var out = document.getElementById('out');
    out.style.display = 'none';
    var el = document.createElement('img');
    el.src = src;
    el.style.width = '100%';
    document.body.appendChild(el);
    el.onload = function() {
      var dh = Math.ceil(window.innerWidth * el.naturalHeight / el.naturalWidth);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'h', h: dh })
      );
    };
  }

  var src = ${JSON.stringify(uri)};
  img.src = src;
})();
</script>
</body>
</html>`;

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html }}
      style={{ height, backgroundColor: "#fff" }}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      onMessage={e => {
        try {
          const d = JSON.parse(e.nativeEvent.data);
          if (d.type === "h" && d.h > 0) setHeight(d.h);
        } catch {}
      }}
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
        <AutoCropImage uri={questionImageUrl!} />
        {hasText && (
          <Text style={[styles.text, { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 8 }]}>
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
});
