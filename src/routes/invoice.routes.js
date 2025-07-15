const express = require('express');
const multer = require('multer');
const InvoiceController = require('../controllers/invoice.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { validateBody, validateQuery } = require('../middleware/validation.middleware');
const { createInvoiceSchema, bulkInvoiceSchema, getInvoicesSchema } = require('../schemas/invoice.schemas');

const router = express.Router();
const invoiceController = new InvoiceController();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
});

router.use(authenticateToken);

router.post('/', requireAdmin, validateBody(createInvoiceSchema), invoiceController.createInvoice.bind(invoiceController));
router.post('/bulk', requireAdmin, upload.single('file'), invoiceController.bulkCreateInvoices.bind(invoiceController));
router.get('/', validateQuery(getInvoicesSchema), invoiceController.getAllInvoices.bind(invoiceController));
router.get('/sample-csv', requireAdmin, invoiceController.downloadSampleCSV.bind(invoiceController));

module.exports = router;