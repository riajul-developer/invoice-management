const { success } = require("zod/v4");

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
      data: null,
      errors: null
    });
  }

  if (err.code === 'P2002') { 
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
      data: null,
      errors: null
    });
  }

  if (err.code === 'P2025') { 
    return res.status(404).json({
      success: false,
      message: 'The requested resource does not exist',
      data: null,
      errors: null
    });
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    data: null,
    errors: null
  });
};

module.exports = {
  errorHandler,
};
