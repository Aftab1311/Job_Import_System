import { Router } from 'express';
import { ImportController } from '../controllers/ImportController';

const router = Router();
const importController = new ImportController();

router.post('/trigger', importController.triggerImport.bind(importController));
router.get('/history', importController.getImportHistory.bind(importController));
router.get('/queue/status', importController.getQueueStatus.bind(importController));
router.get('/:id', importController.getImportById.bind(importController));

export { router as importRoutes };
