const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension).replace(/\s+/g, '-').toLowerCase();
    callback(null, `${Date.now()}-${baseName}${extension}`);
  },
});

const fileFilter = (req, file, callback) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    callback(null, true);
    return;
  }

  callback(new Error('Only image files are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  uploadSingleImage: upload.single('image'),
};
