const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateFarmer = [
  body('NAME').notEmpty().withMessage('Name is required'),
  body('EMAIL').isEmail().withMessage('Valid email is required'),
  body('PHONE').optional().isLength({ min: 10 }).withMessage('Valid phone number is required'),
  handleValidationErrors
];

const validateCow = [
  body('FARMER_ID').isInt({ min: 1 }).withMessage('Valid farmer ID is required'),
  body('TAG_ID').notEmpty().withMessage('Tag ID is required'),
  body('BREED').optional().isString(),
  body('AGE').optional().isInt({ min: 0 }),
  body('WEIGHT').optional().isFloat({ min: 0 }),
  body('HEALTH_STATUS').optional().isString(),
  handleValidationErrors
];

const validateSensor = [
  body('COW_ID').isInt({ min: 1 }).withMessage('Valid cow ID is required'),
  body('SENSOR_TYPE').isIn(['TEMPERATURE','PEDOMETER','GPS','HEART_RATE']).withMessage('Valid sensor type is required'),
  body('INSTALLATION_DATE').optional().isDate(),
  body('STATUS').optional().isIn(['ACTIVE','INACTIVE']),
  handleValidationErrors
];

const validateUser = [
  body('USERNAME').notEmpty().withMessage('Username is required'),
  body('EMAIL').isEmail().withMessage('Valid email is required'),
  body('PASSWORD').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('ROLE').optional().isIn(['FARMER','VET','ADMIN']),
  handleValidationErrors
];

module.exports = {
  validateFarmer,
  validateCow,
  validateSensor,
  validateUser,
  handleValidationErrors
};