import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');

['requests', 'products', 'portfolio', 'avatars', 'ai'].forEach((dir) => {
  const p = path.join(uploadDir, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder || 'requests';
    cb(null, path.join(uploadDir, folder));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname) || '.jpg'}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images allowed'), false);
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 8 * 1024 * 1024 } });

export function setUploadFolder(folder) {
  return (req, res, next) => {
    req.uploadFolder = folder;
    next();
  };
}

export function fileUrl(req, filename) {
  if (!filename) return '';
  if (filename.startsWith('http')) return filename;
  return `${req.protocol}://${req.get('host')}/uploads/${req.uploadFolder || 'requests'}/${filename}`;
}
