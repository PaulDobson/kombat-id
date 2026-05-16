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
// Fonts — using built-in Helvetica family (no external font needed)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Gold color palette matching the reference design
// ---------------------------------------------------------------------------

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C96A";
const GOLD_DARK = "#8B6914";
const BG_DARK = "#1A1A1A";
const OFF_WHITE = "#F0E6C8";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    backgroundColor: BG_DARK,
    padding: 0,
    fontFamily: "Helvetica",
  },

  // Outer gold border frame
  outerBorder: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderWidth: 3,
    borderColor: GOLD,
    borderStyle: "solid",
  },

  // Inner border
  innerBorder: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    bottom: 18,
    borderWidth: 1,
    borderColor: GOLD_DARK,
    borderStyle: "solid",
  },

  // Corner decorations (top-left, top-right, bottom-left, bottom-right)
  cornerTL: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: GOLD_LIGHT,
    borderStyle: "solid",
  },
  cornerTR: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: GOLD_LIGHT,
    borderStyle: "solid",
  },
  cornerBL: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: GOLD_LIGHT,
    borderStyle: "solid",
  },
  cornerBR: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: GOLD_LIGHT,
    borderStyle: "solid",
  },

  // Main content container
  content: {
    flex: 1,
    paddingHorizontal: 50,
    paddingVertical: 30,
    alignItems: "center",
  },

  // Logo
  logo: {
    width: 180,
    height: 50,
    objectFit: "contain",
    marginBottom: 8,
  },

  // Gold ribbon banner
  ribbon: {
    backgroundColor: GOLD,
    paddingHorizontal: 40,
    paddingVertical: 6,
    marginBottom: 16,
    alignItems: "center",
  },
  ribbonText: {
    color: BG_DARK,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // "otorgado a:" label
  grantedLabel: {
    color: OFF_WHITE,
    fontSize: 11,
    fontFamily: "Helvetica-Oblique",
    marginBottom: 6,
    letterSpacing: 1,
  },

  // Student name
  studentName: {
    color: GOLD_LIGHT,
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 1,
  },

  // Grade
  gradeText: {
    color: GOLD,
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 14,
    letterSpacing: 0.5,
  },

  // Academy
  academyText: {
    color: OFF_WHITE,
    fontSize: 11,
    fontFamily: "Helvetica",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  // Description paragraph
  description: {
    color: "#CCBBAA",
    fontSize: 9.5,
    fontFamily: "Helvetica-Oblique",
    textAlign: "center",
    lineHeight: 1.6,
    maxWidth: 420,
    marginBottom: 20,
  },

  // Divider line
  divider: {
    width: "80%",
    height: 1,
    backgroundColor: GOLD_DARK,
    marginBottom: 16,
  },

  // Signature row
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginBottom: 20,
  },
  signatureBlock: {
    alignItems: "center",
    width: "45%",
  },
  signatureLine: {
    width: "100%",
    height: 1,
    backgroundColor: GOLD_DARK,
    marginBottom: 4,
  },
  signatureLabel: {
    color: "#888877",
    fontSize: 8,
    fontFamily: "Helvetica",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // QR section
  qrSection: {
    alignItems: "center",
    marginBottom: 12,
  },
  qrLabel: {
    color: "#888877",
    fontSize: 7,
    fontFamily: "Helvetica",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  qrImage: {
    width: 80,
    height: 80,
  },

  // Bottom row: member ID
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    width: "100%",
    paddingHorizontal: 30,
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
  },
  memberIdText: {
    color: GOLD,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Gold seal placeholder (bottom-left)
  seal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: GOLD_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  sealText: {
    color: GOLD_LIGHT,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
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
        {/* Border frame */}
        <View style={styles.outerBorder} />
        <View style={styles.innerBorder} />

        {/* Corner decorations */}
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />

        {/* Main content */}
        <View style={styles.content}>
          {/* Logo */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logoUrl} style={styles.logo} />

          {/* Gold ribbon */}
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>Certificado de Membresía</Text>
          </View>

          {/* Granted label */}
          <Text style={styles.grantedLabel}>otorgado a:</Text>

          {/* Student name */}
          <Text style={styles.studentName}>{fullName}</Text>

          {/* Grade */}
          <Text style={styles.gradeText}>[{gradeLabel}]</Text>

          {/* Description */}
          <Text style={styles.description}>
            Por haber demostrado la disciplina, constancia y valores requeridos
            dentro de nuestra academia. Se concede este certificado con fecha de{" "}
            {activationDate} en {locationText}.
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Signatures */}
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Firma Instructor</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Firma Director</Text>
            </View>
          </View>

          {/* QR code */}
          <View style={styles.qrSection}>
            <Text style={styles.qrLabel}>Escanear para validar perfil</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={qrDataUrl} style={styles.qrImage} />
          </View>
        </View>

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          {/* Gold seal */}
          <View style={styles.seal}>
            <Text style={styles.sealText}>K</Text>
          </View>

          {/* Member ID */}
          <Text style={styles.memberIdText}>Member ID: {memberId}</Text>
        </View>
      </Page>
    </Document>
  );
}
