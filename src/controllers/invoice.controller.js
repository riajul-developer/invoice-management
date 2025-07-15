const InvoiceService = require('../services/invoice.service');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const invoiceService = new InvoiceService();

class InvoiceController {
  async createInvoice(req, res, next) {
    try {
      const invoice = await invoiceService.createInvoice(req.body);
      res.status(201).json({
        message: 'Invoice created successfully',
        invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateInvoices(req, res, next) {
    try {
      const file = req.file;
      let invoices = [];

      if (file) {
        // Handle CSV file
        if (file.mimetype === 'text/csv') {
          const results = [];
          
          fs.createReadStream(file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
              try {
                invoices = results.map(row => ({
                  account_number: row.account_number || row.Account_Number,
                  invoice_number: row.invoice_number || row.Invoice_Number,
                  amount: parseFloat(row.amount || row.Amount),
                  description: row.description || row.Description,
                  status: row.status || row.Status || 'PENDING',
                  user_name: row.user_name || row.User_Name,
                  user_email: row.user_email || row.User_Email,
                }));

                const result = await invoiceService.bulkCreateInvoices(invoices);
                
                // Clean up uploaded file
                fs.unlinkSync(file.path);
                
                res.json({
                  message: 'Bulk invoice creation completed',
                  ...result,
                });
              } catch (error) {
                fs.unlinkSync(file.path);
                next(error);
              }
            });
        } else {
          // Handle JSON file
          const fileContent = fs.readFileSync(file.path, 'utf8');
          invoices = JSON.parse(fileContent);
          
          const result = await invoiceService.bulkCreateInvoices(invoices);
          
          // Clean up uploaded file
          fs.unlinkSync(file.path);
          
          res.json({
            message: 'Bulk invoice creation completed',
            ...result,
          });
        }
      } else {
        // Handle direct JSON in request body
        const { invoices: invoiceData } = req.body;
        const result = await invoiceService.bulkCreateInvoices(invoiceData);
        
        res.json({
          message: 'Bulk invoice creation completed',
          ...result,
        });
      }
    } catch (error) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  async getAllInvoices(req, res, next) {
    try {
      const { page, limit, status, user_id } = req.query;
      const user = req.user;
      
      let result;
      if (user.role === 'ADMIN') {
        result = await invoiceService.getAllInvoices(page, limit, status, user_id);
      } else {
        result = await invoiceService.getUserInvoices(user.id, page, limit);
      }
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async downloadSampleCSV(req, res, next) {
    try {
      const sampleData = `account_number,invoice_number,amount,description,status,user_name,user_email
        ACC001,INV001,100.50,Sample Invoice 1,PENDING,John Doe,john@example.com
        ACC002,INV002,250.75,Sample Invoice 2,PAID,Jane Smith,jane@example.com
        ACC003,INV003,175.25,Sample Invoice 3,PENDING,Bob Johnson,bob@example.com`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sample_invoices.csv');
      res.send(sampleData);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InvoiceController;