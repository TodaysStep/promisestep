# PromiseStep Java public-read source candidate

This candidate is a read-only Java 21+ HTTP client for PromiseStep's versioned public reference API. It is not a Java implementation of the complete SDK core. It does not create private records, accept owner grants, send credentials, or perform private writes.

Requirements: Java 21+. No external dependencies. In `sdk/java` run:

```sh
mkdir -p /tmp/promisestep-java-classes
javac --release 21 -d /tmp/promisestep-java-classes src/promisestep/PublicReadClient.java test/promisestep/PublicReadClientTest.java
java --add-modules jdk.httpserver -cp /tmp/promisestep-java-classes promisestep.PublicReadClientTest
```

The loopback test covers request method, rejection of credentialed/non-HTTPS public roots, refusal of redirects, oversized responses, invalid UTF-8, HTML fallback, and forbidden resource paths. It is not a live production-domain test, human review, distribution license, or owner-service authorization.

License: UNLICENSED pending an explicit founder-approved grant. Source candidate only; not deployed to promisestep.com and not published to a package registry.
