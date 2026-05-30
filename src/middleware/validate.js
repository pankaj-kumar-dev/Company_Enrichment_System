'use strict';

/**
 * Lightweight schema validator for request bodies.
 *
 * Schema: { fieldName: (value) => 'error string' | null }
 *
 * Usage:
 *   router.post('/', validate({ domain: required('domain') }), handler)
 */
const validate = (schema) => (req, res, next) => {
  const errors = [];

  for (const [field, validator] of Object.entries(schema)) {
    const error = validator(req.body[field]);
    if (error) errors.push({ field, message: error });
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

// Reusable validator factories
validate.required = (label) => (val) =>
  val === undefined || val === null || val === '' ? `${label} is required` : null;

validate.string = (label) => (val) =>
  val !== undefined && typeof val !== 'string' ? `${label} must be a string` : null;

validate.compose =
  (...fns) =>
  (val) => {
    for (const fn of fns) {
      const err = fn(val);
      if (err) return err;
    }
    return null;
  };

module.exports = validate;
