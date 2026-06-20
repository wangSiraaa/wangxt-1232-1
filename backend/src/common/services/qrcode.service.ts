import { Injectable } from '@nestjs/common';
import * as qrcode from 'qrcode';

@Injectable()
export class QrCodeService {
  async generate(data: string): Promise<string> {
    try {
      return await qrcode.toDataURL(data, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (error) {
      throw new Error('QR码生成失败');
    }
  }

  async generateWithLogo(data: string): Promise<Buffer> {
    return await qrcode.toBuffer(data, {
      width: 300,
      margin: 2,
    });
  }
}
