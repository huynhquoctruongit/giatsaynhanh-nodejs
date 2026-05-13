import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { env } from '../../config/env';

export const generateQrToken = () => randomUUID();

export const buildQrUrl = (token: string) =>
  `${env.publicWebUrl.replace(/\/$/, '')}/q/${token}`;

export const generateQrDataUrl = async (token: string): Promise<string> => {
  const url = buildQrUrl(token);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });
};

export const generateQrPngBuffer = async (token: string): Promise<Buffer> => {
  const url = buildQrUrl(token);
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
    type: 'png',
  });
};
