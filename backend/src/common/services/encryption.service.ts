import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly key: string;

  constructor(private configService: ConfigService) {
    this.key = this.configService.get('ENCRYPTION_KEY');
  }

  encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.key).toString();
  }

  decrypt(encrypted: string): string {
    const bytes = CryptoJS.AES.decrypt(encrypted, this.key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  encryptObject(obj: any): string {
    return this.encrypt(JSON.stringify(obj));
  }

  decryptObject(encrypted: string): any {
    return JSON.parse(this.decrypt(encrypted));
  }
}
