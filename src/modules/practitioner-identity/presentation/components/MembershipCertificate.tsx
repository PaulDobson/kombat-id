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
// Paleta de colores — oficial Kombat Federation
// ---------------------------------------------------------------------------

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E2C96A";
const GOLD_MID = "#A8882E";
const GOLD_DARK = "#6B500E";
const GOLD_FAINT = "#2A1F08";

const BG_PAGE = "#0D0D0D";
const BG_SIDEBAR = "#080808";
const BG_HEADER = "#111111";
const SIG_BG = "#F5F0E8"; // color cálido similar al papel de firma

const WHITE = "#FFFFFF";
const TEXT_BODY = "#C8BEA8";
const TEXT_MUTED = "#6B6455";
const TEXT_DARK_ON_LIGHT = "#1A1408";

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    backgroundColor: BG_PAGE,
    padding: 0,
    fontFamily: "Helvetica",
    flexDirection: "row",
  },

  // ── SIDEBAR IZQUIERDO ───────────────────────────────────────────────────
  sidebar: {
    width: 200,
    backgroundColor: BG_SIDEBAR,
    borderRightWidth: 1,
    borderRightColor: GOLD_DARK,
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 18,
  },

  sidebarTop: {
    alignItems: "center",
    width: "100%",
  },

  logo: {
    width: 140,
    height: 40,
    objectFit: "contain",
    marginBottom: 16,
  },

  sidebarGoldLine: {
    width: 40,
    height: 1,
    backgroundColor: GOLD,
    marginBottom: 20,
  },

  // Número de federación — destacado
  fedBadge: {
    backgroundColor: GOLD_FAINT,
    borderWidth: 1,
    borderColor: GOLD_DARK,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 20,
    alignItems: "center",
    width: "100%",
  },
  fedBadgeLabel: {
    color: TEXT_MUTED,
    fontSize: 5.5,
    fontFamily: "Helvetica",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 3,
  },
  fedBadgeValue: {
    color: GOLD,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.5,
    textAlign: "center",
  },

  // QR
  qrFrame: {
    padding: 5,
    borderWidth: 1,
    borderColor: GOLD_DARK,
    backgroundColor: WHITE,
    marginBottom: 7,
  },
  qrImage: {
    width: 108,
    height: 108,
  },
  qrLabel: {
    color: TEXT_MUTED,
    fontSize: 5.5,
    fontFamily: "Helvetica",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    textAlign: "center",
  },

  sidebarBottom: {
    alignItems: "center",
    width: "100%",
  },

  sealText: {
    color: GOLD_DARK,
    fontSize: 5.5,
    fontFamily: "Helvetica",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 1.6,
  },

  // ── CONTENIDO PRINCIPAL ─────────────────────────────────────────────────
  main: {
    flex: 1,
    flexDirection: "column",
  },

  // Cabecera dorada
  header: {
    backgroundColor: BG_HEADER,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingHorizontal: 32,
    paddingTop: 22,
    paddingBottom: 16,
  },

  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  federationTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  fedTagAccent: {
    width: 3,
    height: 10,
    backgroundColor: GOLD,
    marginRight: 8,
  },
  fedTagText: {
    color: GOLD_MID,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  certNumber: {
    color: TEXT_MUTED,
    fontSize: 6.5,
    fontFamily: "Helvetica",
    letterSpacing: 1.5,
  },

  certTitleBlock: {},
  certTitleMain: {
    color: WHITE,
    fontSize: 34,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 9,
    textTransform: "uppercase",
    marginBottom: 0,
  },
  certTitleSub: {
    color: GOLD,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 5,
    textTransform: "uppercase",
  },

  // Cuerpo
  body: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 18,
    paddingBottom: 0,
    flexDirection: "column",
    justifyContent: "space-between",
  },

  bodyTop: {},

  // Intro
  grantedLabel: {
    color: TEXT_MUTED,
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  studentName: {
    color: GOLD_LIGHT,
    fontSize: 34,
    fontFamily: "Times-Bold",
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  // Datos del practicante — fila con separadores
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 0,
  },
  dataPill: {
    backgroundColor: GOLD_FAINT,
    borderWidth: 1,
    borderColor: GOLD_DARK,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  dataPillText: {
    color: GOLD_LIGHT,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  dataAcademy: {
    color: TEXT_BODY,
    fontSize: 9,
    fontFamily: "Helvetica",
    letterSpacing: 0.3,
  },

  // Texto descriptivo oficial
  descBox: {
    borderLeftWidth: 2,
    borderLeftColor: GOLD_DARK,
    paddingLeft: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  descText: {
    color: TEXT_BODY,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    lineHeight: 1.7,
  },

  // Bandas de datos adicionales
  infoGrid: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 14,
  },
  infoCell: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: GOLD_DARK,
    paddingTop: 7,
    paddingRight: 16,
  },
  infoCellLabel: {
    color: TEXT_MUTED,
    fontSize: 5.5,
    fontFamily: "Helvetica",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  infoCellValue: {
    color: TEXT_BODY,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
  },

  // ── SECCIÓN FIRMAS ──────────────────────────────────────────────────────
  sigSection: {
    backgroundColor: SIG_BG,
    borderTopWidth: 2,
    borderTopColor: GOLD,
    paddingHorizontal: 32,
    paddingTop: 14,
    paddingBottom: 12,
  },

  sigRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 0,
  },

  sigBlock: {
    marginRight: 40,
    alignItems: "flex-start",
  },

  sigImage: {
    width: 130,
    height: 52,
    objectFit: "contain",
    marginBottom: 0,
  },

  sigLine: {
    width: 160,
    height: 1,
    backgroundColor: GOLD_MID,
    marginBottom: 4,
  },

  sigName: {
    color: TEXT_DARK_ON_LIGHT,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
    marginBottom: 1,
  },

  sigRole: {
    color: "#5A4E3A",
    fontSize: 6.5,
    fontFamily: "Helvetica",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // Pie derecho — fecha + sello
  sigFooter: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  issuedText: {
    color: "#9A8A72",
    fontSize: 7,
    fontFamily: "Helvetica-Oblique",
    letterSpacing: 0.3,
  },

  officialStamp: {
    color: GOLD_DARK,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    borderWidth: 1,
    borderColor: GOLD_DARK,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },

  // Acentos de esquina — solo en la página completa
  cornerTL: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 18,
    height: 18,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: GOLD,
  },
  cornerTR: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: GOLD,
  },
  cornerBL: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 18,
    height: 18,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: GOLD,
  },
  cornerBR: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 18,
    height: 18,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: GOLD,
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
  signatureUrl: string;
  signatureUrl2: string;
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
  signatureUrl,
  signatureUrl2,
}: MembershipCertificateProps) {
  const locationText = academyCity
    ? `${academyName} · ${academyCity}`
    : academyName;

  // Número de certificado basado en memberId para trazabilidad
  const certNumber = `CERT-${memberId.replace("KMBT-", "").replace("-", "")}`;

  return (
    <Document
      title={`Certificado de Membresía — ${fullName}`}
      author="Federación Kombat Taekwondo Chile"
      subject="Certificado Oficial de Membresía"
      keywords="kombat taekwondo chile federacion membresia oficial"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Acentos de esquina */}
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />

        {/* ── SIDEBAR ── */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarTop}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoUrl} style={styles.logo} />
            <View style={styles.sidebarGoldLine} />

            {/* QR verificación */}
            <View style={styles.qrFrame}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={qrDataUrl} style={styles.qrImage} />
            </View>
            <Text style={styles.qrLabel}>Escanear para verificar</Text>
          </View>

          <View style={styles.sidebarBottom}>
            {/* Member ID badge */}
            <View style={styles.fedBadge}>
              <Text style={styles.fedBadgeLabel}>Member ID</Text>
              <Text style={styles.fedBadgeValue}>{memberId}</Text>
            </View>
            <Text style={styles.sealText}>
              Federación Oficial{"\n"}Kombat Taekwondo Chile
            </Text>
          </View>
        </View>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <View style={styles.main}>
          {/* Cabecera */}
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={styles.federationTag}>
                <View style={styles.fedTagAccent} />
                <Text style={styles.fedTagText}>
                  Federación Kombat Taekwondo Chile
                </Text>
              </View>
              <Text style={styles.certNumber}>{certNumber}</Text>
            </View>
            <View style={styles.certTitleBlock}>
              <Text style={styles.certTitleMain}>Certificado</Text>
              <Text style={styles.certTitleSub}>de Membresía Oficial</Text>
            </View>
          </View>

          {/* Cuerpo */}
          <View style={styles.body}>
            <View style={styles.bodyTop}>
              <Text style={styles.grantedLabel}>
                La Federación Kombat Taekwondo Chile certifica que:
              </Text>
              <Text style={styles.studentName}>{fullName}</Text>

              {/* Grado + Academia */}
              <View style={styles.dataRow}>
                <View style={styles.dataPill}>
                  <Text style={styles.dataPillText}>{gradeLabel}</Text>
                </View>
                <Text style={styles.dataAcademy}>{locationText}</Text>
              </View>

              {/* Texto oficial */}
              <View style={styles.descBox}>
                <Text style={styles.descText}>
                  Se encuentra debidamente inscrito y afiliado a la Federación
                  Kombat Taekwondo Chile, con membresía activa y vigente. El
                  presente documento lo habilita para participar en torneos,
                  seminarios, exámenes de grado y demás actividades oficiales
                  organizadas o reconocidas por la federación, en conformidad
                  con los reglamentos internos vigentes.
                </Text>
              </View>

              {/* Grid de datos */}
              <View style={styles.infoGrid}>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>Fecha de emisión</Text>
                  <Text style={styles.infoCellValue}>{activationDate}</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>Estado</Text>
                  <Text style={styles.infoCellValue}>Activo · Vigente</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>Tipo de membresía</Text>
                  <Text style={styles.infoCellValue}>Practicante Oficial</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoCellLabel}>Verificación</Text>
                  <Text style={styles.infoCellValue}>kombat-id.cl/verify</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── SECCIÓN FIRMAS (fondo cálido) ── */}
          <View style={styles.sigSection}>
            <View style={styles.sigRow}>
              {/* Firma 1 — Presidente */}
              <View style={styles.sigBlock}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={signatureUrl} style={styles.sigImage} />
                <View style={styles.sigLine} />
                <Text style={styles.sigName}>Juan Marcelo Gallardo</Text>
                <Text style={styles.sigRole}>Presidente · Kombat Chile</Text>
              </View>

              {/* Firma 2 — Director Educacional */}
              <View style={styles.sigBlock}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={signatureUrl2} style={styles.sigImage} />
                <View style={styles.sigLine} />
                <Text style={styles.sigName}>Juan Riquelme Pavez</Text>
                <Text style={styles.sigRole}>
                  Director Educacional · Kombat Taekwondo Chile
                </Text>
              </View>
            </View>

            <View style={styles.sigFooter}>
              <Text style={styles.issuedText}>
                Documento emitido digitalmente el {activationDate}. Válido con
                verificación QR.
              </Text>
              <Text style={styles.officialStamp}>Documento Oficial</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
