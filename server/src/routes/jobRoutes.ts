import { Router } from 'express';
import { JobController } from '../controllers/JobController';

const router = Router();
const jobController = new JobController();

router.get('/', jobController.getJobs.bind(jobController));
router.get('/:id', jobController.getJobById.bind(jobController));
router.get('/stats/summary', jobController.getJobStats.bind(jobController));

export { router as jobRoutes };
