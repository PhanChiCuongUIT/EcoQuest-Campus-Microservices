package com.ecoquest.action;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
class EvidenceStorageService {
    private static final long MAX_BYTES = 5L * 1024L * 1024L;
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"
    );

    private final MinioClient minio;
    private final String bucket;

    EvidenceStorageService(MinioClient minio, @Value("${minio.evidence-bucket}") String bucket) {
        this.minio = minio;
        this.bucket = bucket;
    }

    UploadEvidenceResponse upload(UploadEvidenceRequest request) {
        try {
            var parsed = parse(request);
            if (parsed.bytes.length == 0) {
                throw new ResponseStatusException(BAD_REQUEST, "Evidence file is empty.");
            }
            if (parsed.bytes.length > MAX_BYTES) {
                throw new ResponseStatusException(BAD_REQUEST, "Evidence file exceeds the 5MB limit.");
            }
            if (!ALLOWED_TYPES.contains(parsed.contentType)) {
                throw new ResponseStatusException(BAD_REQUEST, "Unsupported evidence content type.");
            }
            ensureBucket();
            var objectKey = UUID.randomUUID() + extension(parsed.fileName, parsed.contentType);
            minio.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .contentType(parsed.contentType)
                    .stream(new ByteArrayInputStream(parsed.bytes), parsed.bytes.length, -1)
                    .build());
            return new UploadEvidenceResponse("/actions/evidence/" + URLEncoder.encode(objectKey, StandardCharsets.UTF_8),
                    objectKey, parsed.contentType, parsed.bytes.length);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Could not upload evidence.", ex);
        }
    }

    ResponseEntity<InputStreamResource> download(String objectKey) {
        try {
            var object = minio.getObject(GetObjectArgs.builder().bucket(bucket).object(objectKey).build());
            var contentType = object.headers().get(HttpHeaders.CONTENT_TYPE);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : contentType))
                    .body(new InputStreamResource(object));
        } catch (Exception ex) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Evidence not found.", ex);
        }
    }

    private ParsedEvidence parse(UploadEvidenceRequest request) {
        var contentType = request.contentType();
        var encoded = request.base64();
        if (request.dataUrl() != null && !request.dataUrl().isBlank()) {
            var comma = request.dataUrl().indexOf(',');
            if (comma < 0 || !request.dataUrl().startsWith("data:")) {
                throw new ResponseStatusException(BAD_REQUEST, "Invalid evidence data URL.");
            }
            var metadata = request.dataUrl().substring("data:".length(), comma);
            contentType = metadata.split(";")[0];
            encoded = request.dataUrl().substring(comma + 1);
        }
        if (contentType == null || contentType.isBlank() || encoded == null || encoded.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "contentType and base64/dataUrl are required.");
        }
        return new ParsedEvidence(
                request.fileName() == null ? "evidence" : request.fileName(),
                contentType.toLowerCase(),
                Base64.getDecoder().decode(encoded)
        );
    }

    private void ensureBucket() throws Exception {
        if (!minio.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
            minio.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }

    private String extension(String fileName, String contentType) {
        if (fileName != null && fileName.contains(".")) {
            return fileName.substring(fileName.lastIndexOf('.')).replaceAll("[^A-Za-z0-9.]", "");
        }
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "application/pdf" -> ".pdf";
            default -> "";
        };
    }

    private record ParsedEvidence(String fileName, String contentType, byte[] bytes) {
    }
}
