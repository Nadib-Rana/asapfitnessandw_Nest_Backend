import { Injectable } from "@nestjs/common";

@Injectable()
export class StorageService {
  getObjectUrl(key: string, bucket: string): string {
    const endpoint = process.env.STORAGE_PUBLIC_URL ?? "";

    if (!endpoint) {
      return key;
    }

    const normalizedBase = endpoint.replace(/\/+$/, "");
    const encodedKey = key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `${normalizedBase}/${bucket}/${encodedKey}`;
  }
}
