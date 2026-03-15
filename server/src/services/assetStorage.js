import crypto from 'crypto';
import path from 'path';
import { config } from '../config.js';
import { Models } from '../models.js';

function slugifyFilename(filename = 'upload.bin') {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function createSignature(assetId, expiresAt) {
  return crypto
    .createHmac('sha256', config.objectStorage.signingSecret)
    .update(`${assetId}:${expiresAt}`)
    .digest('hex');
}

export const AssetStorageService = {
  reserveUpload({ userId, purpose, filename, contentType, visibility = 'private', retentionClass = 'temporary' }) {
    const assetId = `asset_${Date.now()}`;
    const safeFilename = slugifyFilename(filename);
    const objectKey = `${purpose}/${userId || 'anonymous'}/${assetId}-${safeFilename}`;
    const expiresAt = new Date(Date.now() + config.objectStorage.tempRetentionHours * 60 * 60 * 1000).toISOString();
    const signature = createSignature(assetId, expiresAt);
    const publicUrl = visibility === 'public' && config.objectStorage.publicBaseUrl
      ? `${config.objectStorage.publicBaseUrl.replace(/\/$/, '')}/${objectKey}`
      : null;
    const signedUrl = publicUrl || `/api/v2/assets/${assetId}/access?expires=${encodeURIComponent(expiresAt)}&sig=${signature}`;

    const asset = {
      id: assetId,
      userId,
      purpose,
      objectKey,
      bucket: config.objectStorage.bucket,
      provider: config.objectStorage.provider,
      visibility,
      contentType,
      originalFilename: path.basename(filename),
      publicUrl,
      signedUrl,
      expiresAt,
      retentionClass,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };

    Models.assetObjects.set(assetId, asset);
    return asset;
  },

  getAsset(assetId) {
    return Models.assetObjects.get(assetId) || null;
  },

  listAssets({ userId, purpose }) {
    return Array.from(Models.assetObjects.values()).filter((asset) => {
      if (userId && asset.userId !== userId) return false;
      if (purpose && asset.purpose !== purpose) return false;
      return !asset.deletedAt;
    });
  },

  sweepExpiredTemporaryAssets() {
    const now = Date.now();
    const removed = [];
    for (const asset of Models.assetObjects.values()) {
      if (asset.deletedAt || asset.retentionClass !== 'temporary' || !asset.expiresAt) continue;
      if (new Date(asset.expiresAt).getTime() <= now) {
        asset.deletedAt = new Date().toISOString();
        removed.push(asset.id);
      }
    }
    return { removedCount: removed.length, removed };
  },
};

export default AssetStorageService;