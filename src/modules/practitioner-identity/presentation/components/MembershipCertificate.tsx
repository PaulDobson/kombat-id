// This file is used server-side only (via @react-pdf/renderer in a Route Handler).
// Do NOT add "use client" — it runs in Node.js context.

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ---------------------------------------------------------------------------
// Paleta de colores
// ---------------------------------------------------------------------------

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C96A";
const GOLD_DARK = "#8B6914";
const BG_DARK = "#111111";
const BG_PANEL = "#0C0C0C";
const OFF_WHITE = "#F0E6C8";
const MUTED = "#888877";
const MUTED_LIGHT = "#BBAA99";

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    backgroundColor: BG_DARK,
    padding: 0,
    fontFamily: "Helvetica",
  },

  // Acentos de esquina (L-brackets dorados)
  cornerTL: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: GOLD,
  },
  cornerTR: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: GOLD,
  },
  cornerBL: {
    position: "absolute",
    bottom: 10,
    left: 10,
    width: 24,
    height: 24,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: GOLD,
  },
  cornerBR: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: GOLD,
  },

  // Layout principal en dos columnas
  mainRow: {
    flex: 1,
    flexDirection: "row",
  },

  // ── Panel izquierdo ──────────────────────────────────────────────────────
  leftPanel: {
    width: 220,
    backgroundColor: BG_PANEL,
    borderRightWidth: 1,
    borderRightColor: GOLD_DARK,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 24,
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftTop: {
    alignItems: "center",
    width: "100%",
  },
  leftBottom: {
    alignItems: "center",
    width: "100%",
  },

  logo: {
    width: 155,
    height: 44,
    objectFit: "contain",
    marginBottom: 20,
  },

  leftDivider: {
    width: "50%",
    height: 1,
    backgroundColor: GOLD_DARK,
    marginBottom: 18,
  },

  // QR con marco sutil
  qrFrame: {
    padding: 6,
    borderWidth: 1,
    borderColor: GOLD_DARK,
    marginBottom: 8,
  },
  qrImage: {
    width: 96,
    height: 96,
  },
  qrLabel: {
    color: MUTED,
    fontSize: 6,
    fontFamily: "Helvetica",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 20,
  },

  // Member ID
  memberIdCaption: {
    color: "#555544",
    fontSize: 6,
    fontFamily: "Helvetica",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 3,
  },
  memberIdValue: {
    color: GOLD,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textAlign: "center",
  },

  // ── Panel derecho ────────────────────────────────────────────────────────
  rightPanel: {
    flex: 1,
    paddingHorizontal: 38,
    paddingTop: 28,
    paddingBottom: 22,
    justifyContent: "space-between",
  },

  topSection: {},
  bottomSection: {},

  // Etiqueta organización
  orgLabel: {
    color: GOLD_DARK,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // Título principal
  certTitle: {
    color: OFF_WHITE,
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 7,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  certSubtitle: {
    color: GOLD,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  titleDivider: {
    width: "100%",
    height: 1,
    backgroundColor: GOLD_DARK,
    marginBottom: 14,
  },

  // "Este certificado se otorga a:"
  grantedLabel: {
    color: MUTED,
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    letterSpacing: 0.5,
    marginBottom: 5,
  },

  // Nombre del alumno — Times-Bold para elegancia
  studentName: {
    color: GOLD_LIGHT,
    fontSize: 30,
    fontFamily: "Times-Bold",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Grado con acento de barra
  gradeBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  gradeAccent: {
    width: 3,
    height: 16,
    backgroundColor: GOLD,
    marginRight: 10,
  },
  gradeText: {
    color: GOLD_LIGHT,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },

  // Academia
  academyText: {
    color: MUTED_LIGHT,
    fontSize: 10,
    fontFamily: "Helvetica",
    letterSpacing: 0.3,
    marginBottom: 12,
  },

  // Descripción
  description: {
    color: MUTED,
    fontSize: 8.5,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.75,
  },

  // Divisor firmas
  sigDivider: {
    width: "100%",
    height: 1,
    backgroundColor: GOLD_DARK,
    marginBottom: 14,
  },

  // Firmas
  signatureRow: {
    flexDirection: "row",
  },
  signatureBlock: {
    marginRight: 48,
    alignItems: "flex-start",
  },
  signatureScript: {
    color: GOLD_LIGHT,
    fontSize: 18,
    fontFamily: "Helvetica-BoldOblique",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  signatureLine: {
    width: 155,
    height: 1,
    backgroundColor: GOLD_DARK,
    marginBottom: 4,
  },
  signatureLabel: {
    color: MUTED,
    fontSize: 7,
    fontFamily: "Helvetica",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Fecha de emisión
  issueDateRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  issueDateText: {
    color: "#444433",
    fontSize: 7.5,
    fontFamily: "Helvetica-Oblique",
    letterSpacing: 0.3,
  },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MembershipCertificateProps {
  fullName: string;
  gradeLabel: string;
  academyName: string;
  academyCity: string | null;
  memberId: string;
  activationDate: string;
  qrDataUrl: string;
  logoUrl: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MembershipCertificate({
  fullName,
  gradeLabel,
  academyName,
  academyCity,
  memberId,
  activationDate,
  qrDataUrl,
  logoUrl,
}: MembershipCertificateProps) {
  const locationText = academyCity
    ? `${academyName}, ${academyCity}, Chile`
    : `${academyName}, Chile`;

  return (
    <Document
      title={`Certificado de Membresía — ${fullName}`}
      author="Kombat Taekwondo Chile"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Acentos de esquina */}
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />

        {/* Layout principal dos columnas */}
        <View style={styles.mainRow}>
          {/* ── Panel izquierdo ── */}
          <View style={styles.leftPanel}>
            <View style={styles.leftTop}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={logoUrl} style={styles.logo} />
              <View style={styles.leftDivider} />
              {/* QR */}
              <View style={styles.qrFrame}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={qrDataUrl} style={styles.qrImage} />
              </View>
              <Text style={styles.qrLabel}>Escanear para verificar</Text>
            </View>
            <View style={styles.leftBottom}>
              <Text style={styles.memberIdCaption}>Member ID</Text>
              <Text style={styles.memberIdValue}>{memberId}</Text>
            </View>
          </View>

          {/* ── Panel derecho ── */}
          <View style={styles.rightPanel}>
            {/* Sección superior */}
            <View style={styles.topSection}>
              <Text style={styles.orgLabel}>Kombat Taekwondo Chile</Text>
              <Text style={styles.certTitle}>Certificado</Text>
              <Text style={styles.certSubtitle}>de Membresía</Text>
              <View style={styles.titleDivider} />
              <Text style={styles.grantedLabel}>
                Este certificado se otorga a:
              </Text>
              <Text style={styles.studentName}>{fullName}</Text>
              <View style={styles.gradeBadge}>
                <View style={styles.gradeAccent} />
                <Text style={styles.gradeText}>{gradeLabel}</Text>
              </View>
              <Text style={styles.academyText}>{locationText}</Text>
              <Text style={styles.description}>
                Por haber demostrado disciplina, constancia y los valores del
                Taekwondo dentro de nuestra institución. Este documento acredita
                su membresía activa y vigente en Kombat Taekwondo Chile.
              </Text>
            </View>

            {/* Sección inferior — firmas */}
            <View style={styles.bottomSection}>
              <View style={styles.sigDivider} />
              <View style={styles.signatureRow}>
                <View style={styles.signatureBlock}>
                  <Text style={styles.signatureScript}>Dir. Educacional</Text>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureLabel}>
                    Director Educacional
                  </Text>
                </View>
                <View style={styles.signatureBlock}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureLabel}>Firma Director</Text>
                </View>
              </View>
              <View style={styles.issueDateRow}>
                <Text style={styles.issueDateText}>
                  Emitido el {activationDate}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
