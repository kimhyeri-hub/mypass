package com.interview.backend.tts;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;

@Service
public class TtsService {

    private static final String TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
    private static final String CHROMIUM_VERSION = "143.0.3650.75";
    private static final String WSS_URL =
            "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=" + TOKEN;
    private static final Map<String, String> VOICES = Map.of(
            "male", "ko-KR-InJoonNeural",
            "female", "ko-KR-SunHiNeural");
    private static final String DEFAULT_GENDER = "male";
    private static final String RATE = "+0%";
    private static final String PITCH = "+0Hz";
    private static final DateTimeFormatter JS_DATE =
            DateTimeFormatter.ofPattern("EEE MMM dd yyyy HH:mm:ss", Locale.ENGLISH);

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public static String cleanText(String text) {
        if (text == null) {
            return "";
        }
        return text
                .replaceAll("[*_`#>]+", "")
                .replaceAll("\\s*\\n+\\s*", " ")
                .replaceAll("\\s{2,}", " ")
                .trim();
    }

    public byte[] synthesize(String text, String gender) throws Exception {
        String voice = VOICES.getOrDefault(gender == null ? DEFAULT_GENDER : gender, VOICES.get(DEFAULT_GENDER));
        ByteArrayOutputStream audio = new ByteArrayOutputStream();
        CompletableFuture<Void> done = new CompletableFuture<>();

        String url = WSS_URL
                + "&ConnectionId=" + newId()
                + "&Sec-MS-GEC=" + secMsGec()
                + "&Sec-MS-GEC-Version=1-" + CHROMIUM_VERSION;

        WebSocket.Listener listener = new WebSocket.Listener() {
            private final StringBuilder textBuffer = new StringBuilder();
            private final ByteArrayOutputStream binaryBuffer = new ByteArrayOutputStream();

            @Override
            public void onOpen(WebSocket webSocket) {
                webSocket.request(1);
            }

            @Override
            public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
                textBuffer.append(data);
                if (last) {
                    String message = textBuffer.toString();
                    textBuffer.setLength(0);
                    if (message.contains("Path:turn.end")) {
                        done.complete(null);
                    }
                }
                webSocket.request(1);
                return null;
            }

            @Override
            public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
                byte[] part = new byte[data.remaining()];
                data.get(part);
                binaryBuffer.write(part, 0, part.length);
                if (last) {
                    byte[] message = binaryBuffer.toByteArray();
                    binaryBuffer.reset();
                    if (message.length >= 2) {
                        int headerLength = ((message[0] & 0xFF) << 8) | (message[1] & 0xFF);
                        if (headerLength + 2 <= message.length) {
                            String headers = new String(message, 2, headerLength, StandardCharsets.UTF_8);
                            if (headers.contains("Path:audio") && headers.contains("audio/mpeg")) {
                                audio.write(message, 2 + headerLength, message.length - 2 - headerLength);
                            }
                        }
                    }
                }
                webSocket.request(1);
                return null;
            }

            @Override
            public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
                done.complete(null);
                return null;
            }

            @Override
            public void onError(WebSocket webSocket, Throwable error) {
                done.completeExceptionally(error);
            }
        };

        WebSocket socket = httpClient.newWebSocketBuilder()
                .header("Pragma", "no-cache")
                .header("Cache-Control", "no-cache")
                .header("Origin", "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                        + " (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0")
                .header("Accept-Language", "en-US,en;q=0.9")
                .header("Cookie", "muid=" + HexFormat.of().withUpperCase().formatHex(randomBytes(16)) + ";")
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .buildAsync(URI.create(url), listener)
                .get(10, TimeUnit.SECONDS);

        try {
            socket.sendText(configMessage(), true).get(5, TimeUnit.SECONDS);
            socket.sendText(ssmlMessage(text, voice), true).get(5, TimeUnit.SECONDS);
            done.get(15, TimeUnit.SECONDS);
        } finally {
            socket.abort();
        }

        if (audio.size() == 0) {
            throw new IllegalStateException("음성 데이터가 비어 있습니다.");
        }
        return audio.toByteArray();
    }

    private static String configMessage() {
        return "X-Timestamp:" + jsDate() + "\r\n"
                + "Content-Type:application/json; charset=utf-8\r\n"
                + "Path:speech.config\r\n\r\n"
                + "{\"context\":{\"synthesis\":{\"audio\":{\"metadataoptions\":{"
                + "\"sentenceBoundaryEnabled\":\"true\",\"wordBoundaryEnabled\":\"false\"},"
                + "\"outputFormat\":\"audio-24khz-48kbitrate-mono-mp3\"}}}}\r\n";
    }

    private static String ssmlMessage(String text, String voice) {
        String ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
                + "<voice name='" + voice + "'>"
                + "<prosody pitch='" + PITCH + "' rate='" + RATE + "' volume='+0%'>"
                + escapeXml(text)
                + "</prosody></voice></speak>";
        return "X-RequestId:" + newId() + "\r\n"
                + "Content-Type:application/ssml+xml\r\n"
                + "X-Timestamp:" + jsDate() + "Z\r\n"
                + "Path:ssml\r\n\r\n"
                + ssml;
    }

    private static String jsDate() {
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        return JS_DATE.format(now) + " GMT+0000 (Coordinated Universal Time)";
    }

    private static String escapeXml(String text) {
        return text
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("'", "&apos;")
                .replace("\"", "&quot;");
    }

    private static String newId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private static byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        new java.security.SecureRandom().nextBytes(bytes);
        return bytes;
    }

    static String secMsGec() throws Exception {
        long seconds = Instant.now().getEpochSecond() + 11644473600L;
        seconds -= seconds % 300;
        String toHash = (seconds * 10_000_000L) + TOKEN;
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(toHash.getBytes(StandardCharsets.US_ASCII));
        return HexFormat.of().withUpperCase().formatHex(hash);
    }
}
