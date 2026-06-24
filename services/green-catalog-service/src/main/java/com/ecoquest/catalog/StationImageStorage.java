package com.ecoquest.catalog;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Configuration
class CatalogMinioConfig {
    @Bean
    MinioClient catalogMinioClient(
            @Value("${minio.endpoint}") String endpoint,
            @Value("${minio.access-key}") String accessKey,
            @Value("${minio.secret-key}") String secretKey
    ) {
        return MinioClient.builder().endpoint(endpoint).credentials(accessKey, secretKey).build();
    }
}

@Service
class StationImageStorage {
    private static final long MAX_BYTES = 5L * 1024L * 1024L;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/png", "image/jpeg", "image/webp", "image/gif");

    private final MinioClient minio;
    private final String bucket;

    StationImageStorage(MinioClient minio, @Value("${minio.station-bucket}") String bucket) {
        this.minio = minio;
        this.bucket = bucket;
    }

    String upload(String dataUrl) {
        try {
            var parsed = parse(dataUrl);
            if (!ALLOWED_TYPES.contains(parsed.contentType())) {
                throw new ResponseStatusException(BAD_REQUEST, "Station image must be PNG, JPG, WebP, or GIF.");
            }
            if (parsed.bytes().length == 0 || parsed.bytes().length > MAX_BYTES) {
                throw new ResponseStatusException(BAD_REQUEST, "Station image must be between 1 byte and 5MB.");
            }
            ensureBucket();
            var objectKey = UUID.randomUUID() + extension(parsed.contentType());
            minio.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .contentType(parsed.contentType())
                    .stream(new ByteArrayInputStream(parsed.bytes()), parsed.bytes().length, -1)
                    .build());
            return "/catalog/stations/images/" + objectKey;
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Could not upload station image.", ex);
        }
    }

    ResponseEntity<InputStreamResource> download(String objectKey) {
        try {
            var object = minio.getObject(GetObjectArgs.builder().bucket(bucket).object(objectKey).build());
            var contentType = object.headers().get(HttpHeaders.CONTENT_TYPE);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType == null ? "application/octet-stream" : contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(new InputStreamResource(object));
        } catch (Exception ex) {
            throw new ResponseStatusException(NOT_FOUND, "Station image not found.", ex);
        }
    }

    private ParsedDataUrl parse(String dataUrl) {
        if (dataUrl == null || !dataUrl.startsWith("data:") || !dataUrl.contains(",")) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid station image data URL.");
        }
        var comma = dataUrl.indexOf(',');
        var metadata = dataUrl.substring(5, comma);
        if (!metadata.endsWith(";base64")) {
            throw new ResponseStatusException(BAD_REQUEST, "Station image must be base64 encoded.");
        }
        try {
            return new ParsedDataUrl(metadata.substring(0, metadata.length() - 7).toLowerCase(),
                    Base64.getDecoder().decode(dataUrl.substring(comma + 1)));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Station image base64 is invalid.");
        }
    }

    private void ensureBucket() throws Exception {
        if (!minio.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
            minio.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }

    private String extension(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".png";
        };
    }

    private record ParsedDataUrl(String contentType, byte[] bytes) {
    }
}
