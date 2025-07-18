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
        success: true,
        message: 'Invoice created successfully',
        data: { invoice }
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
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          invoices = await this.parseCSVFile(file.path);
        } else if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
          const fileContent = fs.readFileSync(file.path, 'utf8');
          const parsedData = JSON.parse(fileContent);
          invoices = parsedData.invoices || parsedData;
        } else {
          throw new Error('Unsupported file format. Please upload CSV or JSON file.');
        }
        
        fs.unlinkSync(file.path);
      } else {
       
        const { invoices: invoiceData } = req.body;
        invoices = invoiceData;
      }

      const result = await invoiceService.bulkCreateInvoices(invoices);
      
      res.json({
        success: true,
        message: 'Bulk invoice creation completed',
        data: result
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  async parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          const invoice = {
            account_number: data.account_number || data.Account_Number,
            first_name: data.first_name || data.First_Name,
            last_name: data.last_name || data.Last_Name,
            email: data.email || data.Email,
            amount: parseFloat(data.amount || data.Amount),
            currency: data.currency || data.Currency,
            due_on: data.due_on || data.Due_On,
            description: data.description || data.Description || '',
            status: data.status || data.Status || 'PENDING',
          };
          
          results.push(invoice);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async getAllInvoices(req, res, next) {
    try {
      
      const { page, limit, search, status } = req.query;
      const user = req.user;
      
      let result;
      if (user.role === 'ADMIN') {
        result = await invoiceService.getAllInvoices(
          page,
          limit,
          search,
          status
        );
      } else {
        result = await invoiceService.getUserInvoices(
          user.id,
          page,
          limit,  
          search,
          status
        );
      }
      
      res.json({
        success: true,
        message: 'Invoices retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceById(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      const invoice = await invoiceService.getInvoiceById(id, user);
      
      res.json({
        success: true,
        message: 'Invoice retrieved successfully',
        data: { invoice }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body; 
      const user = req.user;
      
      const invoice = await invoiceService.updateInvoice(id, updates, user);
      
      res.json({
        success: true,
        message: 'Invoice updated successfully',
        data: { invoice }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      await invoiceService.deleteInvoice(id, user);
      
      res.json({
        success: true,
        message: 'Invoice deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadSampleCSV(req, res, next) {
    try {
      
      const sampleData = `account_number,first_name,last_name,email,amount,currency,due_on
        50689,Candie,Tallant,ctallant0@nytimes.com,1,CNY,10/24/2024
        88616,Eddi,Oldam,eoldam1@seesaa.net,79,XOF,9/4/2024
        75272,Addy,Knox,aknox2@geocities.jp,63,RUB,9/26/2024
        69429,Daniele,Keig,dkeig3@vistaprint.com,78,NGN,9/28/2024
        35004,Anastasia,Botterill,abotterill4@bluehost.com,56,RUB,12/15/2024`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sample_invoices.csv');
      res.send(sampleData);
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceStats(req, res, next) {
    try {
      const user = req.user;
      const stats = await invoiceService.getInvoiceStats(user);
      
      res.json({
        success: true,
        message: 'Invoice statistics retrieved successfully',
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InvoiceController;