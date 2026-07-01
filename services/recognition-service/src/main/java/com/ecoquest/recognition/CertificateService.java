package com.ecoquest.recognition;

import com.ecoquest.messaging.events.CertificateIssuedEvent;
import com.ecoquest.messaging.events.LeaderboardSeasonClosedEvent;
import com.ecoquest.messaging.rabbitmq.EcoQuestRabbit;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.PageSize;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
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

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

@Service
class CertificateService {
    private static final Color PAPER = new Color(250, 247, 240);
    private static final Color GREEN = new Color(28, 124, 84);
    private static final Color DARK = new Color(26, 46, 34);
    private static final Color MUTED = new Color(90, 110, 98);
    private static final Color LIGHT_MUTED = new Color(122, 143, 130);
    private static final Color GOLD = new Color(197, 155, 39);
    private static final Color PALE_GREEN = new Color(246, 250, 247);
    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH).withZone(ZoneId.systemDefault());

    private final CertificateRepository certificates;
    private final MinioClient minio;
    private final RabbitTemplate rabbit;
    private final String bucket;
    private final RecognitionProgressService progressService;

    CertificateService(CertificateRepository certificates, MinioClient minio, RabbitTemplate rabbit,
                       @Value("${minio.bucket}") String bucket, RecognitionProgressService progressService) {
        this.certificates = certificates;
        this.minio = minio;
        this.rabbit = rabbit;
        this.bucket = bucket;
        this.progressService = progressService;
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
            progressService.recordCertificate(certificate.studentId, certificate.issuedOn);
            rabbit.convertAndSend(EcoQuestRabbit.EXCHANGE, EcoQuestRabbit.CERTIFICATE_ISSUED,
                    new CertificateIssuedEvent(UUID.randomUUID().toString(), Instant.now(), certificate.id,
                            certificate.studentId, certificate.certificateType, certificate.objectKey));
        }
    }

    byte[] renderCertificatePdf(CertificateRecord certificate) {
        return buildCertificatePdf(certificate);
    }

    private byte[] buildCertificatePdf(CertificateRecord certificate) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4.rotate(), 0, 0, 0, 0);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            document.open();

            PdfContentByte canvas = writer.getDirectContent();
            Rectangle page = document.getPageSize();
            float width = page.getWidth();
            float height = page.getHeight();
            float center = width / 2f;

            BaseFont regular = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            BaseFont bold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            BaseFont serif = BaseFont.createFont(BaseFont.TIMES_ROMAN, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            BaseFont serifBold = BaseFont.createFont(BaseFont.TIMES_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            BaseFont serifItalic = BaseFont.createFont(BaseFont.TIMES_ITALIC, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);

            drawBackground(canvas, width, height);
            drawBorders(canvas, width, height);

            drawCentered(canvas, bold, 15, GREEN, "ECOQUEST CAMPUS INITIATIVE", center, height - 70, 5);
            drawCentered(canvas, bold, 9, LIGHT_MUTED, "SUSTAINABILITY & STEWARDSHIP BOARD", center, height - 88, 3);
            drawDivider(canvas, center, height - 108);

            drawCentered(canvas, bold, 11, LIGHT_MUTED, "CERTIFICATE OF EXCELLENCE", center, height - 144, 4);
            drawCentered(canvas, serifBold, 34, DARK, "Sustainability Award", center, height - 184, 1.5f);
            drawCentered(canvas, serifItalic, 15, MUTED, "This certificate is proudly presented to", center, height - 218, 0);
            drawFittedCentered(canvas, serifItalic, recipientFontSize(certificate.studentId), 18, GREEN,
                    safe(certificate.studentId), center, height - 267, width - 150);
            drawCentered(canvas, regular, 11, LIGHT_MUTED, "Student ID: " + safe(certificate.studentId), center, height - 292, 1);

            String season = seasonLabel(certificate.seasonId);
            String type = safe(certificate.certificateType);
            String rank = "#" + certificate.rankNumber;
            String rankText = certificate.rankNumber + rankSuffix(certificate.rankNumber) + " Place";
            String points = String.format(Locale.ENGLISH, "%,d", certificate.points);
            String description = "For outstanding commitment and environmental contributions during the "
                    + type + " " + season + " season, finishing in " + rankText
                    + " on the leaderboard and accumulating " + points
                    + " green points for campus sustainability actions.";
            drawWrappedCentered(canvas, serif, 12, MUTED, description, center, height - 328, 620, 16);

            drawMetrics(canvas, center - 240, height - 402, 480, 52,
                    new String[]{"Season", "Type", "Rank", "Points"},
                    new String[]{season, type, rank, points}, regular, bold);

            drawSeal(canvas, 120, 105, bold);
            drawRegistry(canvas, certificate, center, 104, regular);
            drawSignatures(canvas, width - 330, 92, regular, bold, serifItalic);

            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Could not render EcoQuest certificate PDF.", ex);
        }
    }

    private static void drawBackground(PdfContentByte canvas, float width, float height) {
        canvas.setColorFill(PAPER);
        canvas.rectangle(0, 0, width, height);
        canvas.fill();

        canvas.saveState();
        canvas.setColorFill(new Color(28, 124, 84, 10));
        for (float x = 32; x < width; x += 28) {
            for (float y = 28; y < height; y += 28) {
                canvas.circle(x, y, 0.8f);
                canvas.fill();
            }
        }
        canvas.setColorFill(new Color(28, 124, 84, 8));
        canvas.circle(width / 2f, height / 2f, 145);
        canvas.fill();
        canvas.restoreState();
    }

    private static void drawBorders(PdfContentByte canvas, float width, float height) {
        canvas.setLineWidth(1.5f);
        canvas.setColorStroke(GOLD);
        canvas.rectangle(28, 28, width - 56, height - 56);
        canvas.stroke();

        canvas.setLineWidth(3f);
        canvas.setColorStroke(GREEN);
        canvas.rectangle(38, 38, width - 76, height - 76);
        canvas.stroke();
        canvas.setLineWidth(0.8f);
        canvas.rectangle(44, 44, width - 88, height - 88);
        canvas.stroke();

        drawCorner(canvas, 34, height - 62, true, true);
        drawCorner(canvas, width - 62, height - 62, false, true);
        drawCorner(canvas, 34, 34, true, false);
        drawCorner(canvas, width - 62, 34, false, false);
    }

    private static void drawCorner(PdfContentByte canvas, float x, float y, boolean left, boolean top) {
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(2.5f);
        float sx = left ? x : x + 28;
        float sy = top ? y + 28 : y;
        canvas.moveTo(sx, sy);
        canvas.lineTo(left ? x + 28 : x, sy);
        canvas.moveTo(sx, sy);
        canvas.lineTo(sx, top ? y : y + 28);
        canvas.stroke();
    }

    private static void drawDivider(PdfContentByte canvas, float center, float y) {
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(0.8f);
        canvas.moveTo(center - 140, y);
        canvas.lineTo(center - 18, y);
        canvas.moveTo(center + 18, y);
        canvas.lineTo(center + 140, y);
        canvas.stroke();
        canvas.setColorFill(GOLD);
        canvas.circle(center, y, 4);
        canvas.fill();
    }

    private static void drawMetrics(PdfContentByte canvas, float x, float y, float width, float height,
                                    String[] labels, String[] values, BaseFont regular, BaseFont bold) {
        canvas.setColorFill(PALE_GREEN);
        canvas.roundRectangle(x, y, width, height, 6);
        canvas.fill();
        canvas.setColorStroke(new Color(28, 124, 84, 55));
        canvas.setLineWidth(0.8f);
        canvas.roundRectangle(x, y, width, height, 6);
        canvas.stroke();

        float cell = width / labels.length;
        for (int i = 0; i < labels.length; i++) {
            if (i > 0) {
                canvas.moveTo(x + (cell * i), y);
                canvas.lineTo(x + (cell * i), y + height);
                canvas.stroke();
            }
            drawCentered(canvas, regular, 8, LIGHT_MUTED, labels[i].toUpperCase(Locale.ENGLISH),
                    x + (cell * i) + (cell / 2), y + 32, 1);
            drawFittedCentered(canvas, bold, 12, 7, GREEN, values[i],
                    x + (cell * i) + (cell / 2), y + 15, cell - 14);
        }
    }

    private static void drawSeal(PdfContentByte canvas, float x, float y, BaseFont bold) {
        canvas.setColorFill(GREEN);
        canvas.moveTo(x - 22, y + 8);
        canvas.lineTo(x - 44, y - 62);
        canvas.lineTo(x - 13, y - 44);
        canvas.lineTo(x + 10, y - 62);
        canvas.lineTo(x - 3, y + 8);
        canvas.closePathFillStroke();

        canvas.setColorFill(GOLD);
        canvas.moveTo(x + 3, y + 8);
        canvas.lineTo(x + 16, y - 62);
        canvas.lineTo(x + 36, y - 46);
        canvas.lineTo(x + 55, y - 62);
        canvas.lineTo(x + 28, y + 8);
        canvas.closePathFillStroke();

        canvas.setColorFill(new Color(255, 193, 7));
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(2f);
        canvas.circle(x, y, 36);
        canvas.fillStroke();
        canvas.setLineWidth(1f);
        canvas.setColorStroke(Color.WHITE);
        canvas.circle(x, y, 29);
        canvas.stroke();

        drawCentered(canvas, bold, 7, new Color(78, 52, 46), "EXCELLENCE", x, y + 8, 0);
        drawCentered(canvas, bold, 10, new Color(78, 52, 46), "AWARD", x, y - 3, 0);
        drawCentered(canvas, bold, 6, GREEN, "ECOQUEST", x, y - 15, 0);
    }

    private static void drawRegistry(PdfContentByte canvas, CertificateRecord certificate, float center,
                                     float y, BaseFont regular) {
        drawCentered(canvas, regular, 8, new Color(154, 175, 162),
                "Registry: ECOQUEST LEDGER", center, y + 18, 0);
        drawCentered(canvas, regular, 8, new Color(154, 175, 162),
                "ID: " + safe(certificate.id), center, y + 5, 0);
        drawCentered(canvas, regular, 8, new Color(154, 175, 162),
                "Issued: " + DATE_FORMAT.format(certificate.issuedOn), center, y - 8, 0);
    }

    private static void drawSignatures(PdfContentByte canvas, float x, float y, BaseFont regular,
                                       BaseFont bold, BaseFont signatureFont) {
        drawSignature(canvas, x, y, "University Representative", "UNIVERSITY REPRESENTATIVE", regular, bold, signatureFont);
        drawSignature(canvas, x + 145, y, "Phan Chi Cuong", "ECOQUEST APPLICATION REPRESENTATIVE", regular, bold, signatureFont);
    }

    private static void drawSignature(PdfContentByte canvas, float x, float y, String name, String title,
                                      BaseFont regular, BaseFont bold, BaseFont signatureFont) {
        drawFittedCentered(canvas, signatureFont, 15, 10, DARK, name, x + 50, y + 27, 120);
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(0.9f);
        canvas.moveTo(x, y + 18);
        canvas.lineTo(x + 100, y + 18);
        canvas.stroke();
        drawCentered(canvas, bold, 8, DARK, name, x + 50, y + 6, 0);
        drawFittedCentered(canvas, regular, 6, 4.8f, LIGHT_MUTED, title, x + 50, y - 5, 128);
    }

    private static void drawWrappedCentered(PdfContentByte canvas, BaseFont font, float size, Color color,
                                            String text, float centerX, float startY, float maxWidth, float leading) {
        String[] words = safe(text).split("\\s+");
        StringBuilder line = new StringBuilder();
        float y = startY;
        for (String word : words) {
            String candidate = line.isEmpty() ? word : line + " " + word;
            if (font.getWidthPoint(candidate, size) <= maxWidth) {
                line = new StringBuilder(candidate);
            } else {
                drawCentered(canvas, font, size, color, line.toString(), centerX, y, 0);
                y -= leading;
                line = new StringBuilder(word);
            }
        }
        if (!line.isEmpty()) {
            drawCentered(canvas, font, size, color, line.toString(), centerX, y, 0);
        }
    }

    private static void drawCentered(PdfContentByte canvas, BaseFont font, float size, Color color,
                                     String text, float x, float y, float characterSpacing) {
        canvas.beginText();
        canvas.setFontAndSize(font, size);
        canvas.setColorFill(color);
        canvas.setCharacterSpacing(characterSpacing);
        canvas.showTextAligned(Element.ALIGN_CENTER, safe(text), x, y, 0);
        canvas.setCharacterSpacing(0);
        canvas.endText();
    }

    private static void drawFittedCentered(PdfContentByte canvas, BaseFont font, float startSize, float minSize,
                                           Color color, String text, float x, float y, float maxWidth) {
        String fitted = safe(text);
        float size = startSize;
        while (size > minSize && font.getWidthPoint(fitted, size) > maxWidth) {
            size -= 0.5f;
        }
        while (fitted.length() > 3 && font.getWidthPoint(fitted, size) > maxWidth) {
            fitted = fitted.substring(0, fitted.length() - 4).trim() + "...";
        }
        drawCentered(canvas, font, size, color, fitted, x, y, 0);
    }

    private static float recipientFontSize(String value) {
        int len = safe(value).length();
        if (len > 28) {
            return 32;
        }
        if (len > 18) {
            return 38;
        }
        return 46;
    }

    private static String seasonLabel(String value) {
        return safe(value).replace('-', ' ');
    }

    private static String rankSuffix(int rank) {
        int mod100 = rank % 100;
        if (mod100 >= 11 && mod100 <= 13) {
            return "th";
        }
        return switch (rank % 10) {
            case 1 -> "st";
            case 2 -> "nd";
            case 3 -> "rd";
            default -> "th";
        };
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private void ensureBucket() throws Exception {
        boolean exists = minio.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
        if (!exists) {
            minio.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }
}
