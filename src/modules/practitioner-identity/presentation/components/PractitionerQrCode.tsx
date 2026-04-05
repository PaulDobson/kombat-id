import QRCode from "qrcode";
import Image from "next/image";

interface Props {
  qrToken: string;
  practitionerName: string;
}

export async function PractitionerQrCode({ qrToken, practitionerName }: Props) {
  const domain =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "http://localhost:3000";
  const verifyUrl = `${domain}/verify/qr/${qrToken}`;

  const dataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 256,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return (
    <figure>
      <Image
        src={dataUrl}
        alt={`Código QR de verificación para ${practitionerName}`}
        width={256}
        height={256}
        unoptimized
      />
      <figcaption>Escanea para verificar identidad</figcaption>
    </figure>
  );
}
