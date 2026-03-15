import express from 'express';
import AssetStorageService from '../../services/assetStorage.js';

const router = express.Router();

router.post('/upload-url', (req, res) => {
  const { userId, purpose, filename, contentType, visibility, retentionClass } = req.body || {};
  if (!purpose || !filename) {
    return res.status(400).json({ error: 'purpose and filename are required' });
  }

  const asset = AssetStorageService.reserveUpload({
    userId,
    purpose,
    filename,
    contentType,
    visibility,
    retentionClass,
  });

  res.status(201).json({ asset });
});

router.get('/', (req, res) => {
  const userId = String(req.query.userId || '');
  const purpose = String(req.query.purpose || '');
  res.json({ assets: AssetStorageService.listAssets({ userId: userId || undefined, purpose: purpose || undefined }) });
});

router.get('/:assetId', (req, res) => {
  const asset = AssetStorageService.getAsset(req.params.assetId);
  if (!asset) {
    return res.status(404).json({ error: 'asset_not_found' });
  }
  res.json({ asset });
});

router.post('/retention/sweep', (_req, res) => {
  res.json(AssetStorageService.sweepExpiredTemporaryAssets());
});

export default router;