const { z } = require('zod');

const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        data: null,
        errors: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    
    req.body = result.data;
    next();
  };
};


const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Query validation failed',
          data: null,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

module.exports = {
  validateBody,
  validateQuery,
};