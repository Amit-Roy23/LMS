import type { NextApiRequest, NextApiResponse } from 'next';
import { createApp } from '@academy/api';

// Initialize singleton Express app
const app = createApp();

export const config = {
  api: {
    bodyParser: false, // Let Express handle JSON, form-data, multer uploads
    externalResolver: true, // Express sends response asynchronously
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return app(req, res);
}
