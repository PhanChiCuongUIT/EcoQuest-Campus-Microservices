package com.ecoquest.recognition;

import com.ecoquest.messaging.events.CertificateIssuedEvent;
import com.ecoquest.messaging.events.LeaderboardSeasonClosedEvent;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import com.lowagie.text.Document;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.UUID;

@Service
class CertificateService {
    private final CertificateRepository certificates;
    private final MinioClient minio;
    private final RabbitTemplate rabbit;
    private final String bucket;

    CertificateService(CertificateRepository certificates, MinioClient minio, RabbitTemplate rabbit,
                       @Value("${minio.bucket}") String bucket) {
        this.certificates = certificates;
        this.minio = minio;
        this.rabbit = rabbit;
        this.bucket = bucket;
    }

    @RabbitListener(queues = RecognitionMessagingConfig.SEASON_CLOSED_QUEUE)
    @Transactional
    public void onSeasonClosed(LeaderboardSeasonClosedEvent event) throws Exception {
        ensureBucket();
        for (LeaderboardSeasonClosedEvent.Winner winner : event.winners()) {
            if (certificates.existsBySeasonIdAndStudentId(event.seasonId(), winner.studentId())) {
                continue;
            }
            CertificateRecord certificate = new CertificateRecord();
            certificate.id = UUID.randomUUID().toString();
            certificate.studentId = winner.studentId();
            certificate.seasonId = event.seasonId();
            certificate.rankNumber = winner.rank();
            certificate.points = winner.points();
            certificate.certificateType = winner.rank() <= 3 ? "Top Green Student" : "Green Ambassador";
            certificate.objectKey = "certificates/%s/%s.pdf".formatted(event.seasonId(), certificate.id);
            certificate.issuedOn = Instant.now();

            byte[] pdf = buildCertificatePdf(certificate);
            minio.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(certificate.objectKey)
                    .contentType("application/pdf")
                    .stream(new ByteArrayInputStream(pdf), pdf.length, -1)
                    .build());
            certificates.save(certificate);
            rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.CERTIFICATE_ISSUED,
                    new CertificateIssuedEvent(UUID.randomUUID().toString(), Instant.now(), certificate.id,
                            certificate.studentId, certificate.certificateType, certificate.objectKey));
        }
    }

    private byte[] buildCertificatePdf(CertificateRecord certificate) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate());
        PdfWriter.getInstance(document, out);
        document.open();
        document.add(new Paragraph("EcoQuest Campus", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 30)));
        document.add(new Paragraph("Certificate of Recognition", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 24)));
        document.add(new Paragraph("Awarded to " + certificate.studentId, FontFactory.getFont(FontFactory.HELVETICA, 18)));
        document.add(new Paragraph(certificate.certificateType + " - Rank #" + certificate.rankNumber));
        document.add(new Paragraph("Season: " + certificate.seasonId + " | Points: " + certificate.points));
        document.add(new Paragraph("Issued on: " + certificate.issuedOn));
        document.close();
        return out.toByteArray();
    }

    private void ensureBucket() throws Exception {
        boolean exists = minio.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
        if (!exists) {
            minio.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }
}
