package promisestep;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

public final class PublicReadClientTest {
    static int passed = 0;
    static void check(boolean condition, String explanation) {
        if (!condition) throw new AssertionError(explanation);
        passed++;
    }
    static void rejects(Runnable f) {
        boolean threw = false;
        try { f.run(); } catch (IllegalArgumentException expected) { threw = true; }
        check(threw, "Expected invalid input refusal");
    }
    static void fails(PublicReadClient client, String resource) throws Exception {
        boolean threw = false;
        try { client.get(resource); } catch (IOException expected) { threw = true; }
        check(threw, "Expected bounded HTTP refusal for " + resource);
    }
    public static void main(String[] args) throws Exception {
        rejects(() -> new PublicReadClient(URI.create("http://example.com/api/v1/"), Duration.ofSeconds(1)));
        rejects(() -> new PublicReadClient(URI.create("https://user:pass@example.com/api/v1/"), Duration.ofSeconds(1)));
        rejects(() -> new PublicReadClient(URI.create("https://example.com/api/v1/?token=x"), Duration.ofSeconds(1)));
        rejects(() -> new PublicReadClient(URI.create("https://example.com/other/"), Duration.ofSeconds(1)));
        rejects(() -> new PublicReadClient(URI.create("https://example.com/api/v1/"), Duration.ZERO));

        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicReference<String> seenMethod = new AtomicReference<>(), seenAuthorization = new AtomicReference<>();
        server.createContext("/api/v1/health", exchange -> {
            seenMethod.set(exchange.getRequestMethod());
            seenAuthorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] body = "{\"status\":\"ok\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(200, body.length);
            try (var out = exchange.getResponseBody()) { out.write(body); }
        });
        server.createContext("/api/v1/release", exchange -> {
            exchange.getResponseHeaders().set("Location", "/api/v1/health");
            exchange.sendResponseHeaders(302, -1); exchange.close();
        });
        server.createContext("/api/v1/capabilities", exchange -> {
            byte[] body = "<html>wrong content</html>".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "text/html");
            exchange.sendResponseHeaders(200, body.length);
            try (var out = exchange.getResponseBody()) { out.write(body); }
        });
        server.createContext("/api/v1/schemas", exchange -> {
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, 0);
            try (var out = exchange.getResponseBody()) { out.write(new byte[PublicReadClient.MAX_BYTES + 1]); }
        });
        server.createContext("/api/v1/guidelines", exchange -> {
            byte[] body = new byte[] {(byte)0xc3, (byte)0x28};
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (var out = exchange.getResponseBody()) { out.write(body); }
        });
        server.start();
        try (var client = new PublicReadClient(URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/api/v1/"), Duration.ofSeconds(5))) {
            check(client.get("health").equals("{\"status\":\"ok\"}"), "Local JSON response returned");
            check("GET".equals(seenMethod.get()), "Only GET made");
            check(seenAuthorization.get() == null, "No authorization forwarded");
            rejects(() -> { try { client.get("../private"); } catch (IOException | InterruptedException e) { throw new RuntimeException(e); } });
            fails(client, "release");
            fails(client, "capabilities");
            fails(client, "schemas");
            fails(client, "guidelines");
        } finally { server.stop(0); }
        System.out.println("PromiseStep Java public-read client: " + passed + " checks passed (loopback HTTP only; no production claim)");
    }
}
