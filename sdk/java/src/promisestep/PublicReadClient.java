package promisestep;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;

/** Read-only reference API client. This client conveys no owner-service authority. */
public final class PublicReadClient implements AutoCloseable {
    public static final int MAX_BYTES = 2_000_000;
    private static final Set<String> RESOURCES = Set.of(
        "health", "capabilities", "guidelines", "schemas", "openapi.json", "release");
    private final URI base;
    private final Duration timeout;
    private final HttpClient client;

    public PublicReadClient() {
        this(URI.create("https://promisestep.com/api/v1/"), Duration.ofSeconds(10));
    }

    public PublicReadClient(URI base, Duration timeout) {
        if (base == null || timeout == null || timeout.isNegative() || timeout.isZero()
                || timeout.compareTo(Duration.ofSeconds(60)) > 0) {
            throw new IllegalArgumentException("A base URI and bounded timeout (1–60000ms) are required");
        }
        String scheme = base.getScheme();
        String host = base.getHost();
        boolean loopback = host != null && (host.equals("localhost") || host.equals("127.0.0.1") || host.equals("::1"));
        if (!"https".equalsIgnoreCase(scheme) && !(loopback && "http".equalsIgnoreCase(scheme))) {
            throw new IllegalArgumentException("Use HTTPS or local loopback");
        }
        if (host == null || base.getRawUserInfo() != null || base.getRawQuery() != null || base.getRawFragment() != null
                || !base.getPath().endsWith("/") || !base.getPath().equals("/api/v1/") || host.isBlank()) {
            throw new IllegalArgumentException("Expected a credential-free versioned public API root /api/v1/");
        }
        this.base = base;
        this.timeout = timeout;
        this.client = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .connectTimeout(timeout)
            .build();
    }

    /** Returns an inspected JSON document as UTF-8 text. No private write method is exposed. */
    public String get(String resource) throws IOException, InterruptedException {
        if (resource == null || !RESOURCES.contains(resource)) {
            throw new IllegalArgumentException("Unknown public reference resource");
        }
        URI target = base.resolve(resource);
        if (!target.getHost().equalsIgnoreCase(base.getHost()) || !target.getPath().startsWith("/api/v1/")) {
            throw new IllegalArgumentException("Resource escaped the public reference boundary");
        }
        HttpRequest request = HttpRequest.newBuilder(target)
            .GET().timeout(timeout).header("Accept", "application/json").build();
        HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
        try (InputStream stream = response.body()) {
            if (response.statusCode() != 200) {
                throw new IOException("Public reference API returned HTTP " + response.statusCode());
            }
            String type = response.headers().firstValue("content-type").orElse("");
            if (!type.toLowerCase(java.util.Locale.ROOT).startsWith("application/json")) {
                throw new IOException("Expected JSON, not an HTML fallback");
            }
            if (response.headers().firstValueAsLong("content-length").orElse(0) > MAX_BYTES) {
                throw new IOException("Public reference response exceeds 2 MB");
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int count;
            while ((count = stream.read(buf)) >= 0) {
                if (count == 0) continue;
                if (output.size() + count > MAX_BYTES) {
                    throw new IOException("Public reference response exceeds 2 MB");
                }
                output.write(buf, 0, count);
            }
            var decoder = java.nio.charset.StandardCharsets.UTF_8.newDecoder();
            decoder.onMalformedInput(java.nio.charset.CodingErrorAction.REPORT);
            decoder.onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT);
            try {
                return decoder.decode(java.nio.ByteBuffer.wrap(output.toByteArray())).toString();
            } catch (java.nio.charset.CharacterCodingException e) {
                throw new IOException("Public reference response is not UTF-8", e);
            }
        }
    }

    @Override public void close() { client.close(); }
}
