/**
 * Password validation logic to ensure it meets security requirements:
 * - Minimum 8 characters
 * - At least one letter (uppercase or lowercase)
 */
const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: "Password is required" };
  }

  const minLength = 8;
  const hasLetter = /[a-zA-Z]/.test(password);

  if (password.length < minLength) {
    return {
      isValid: false,
      message: `Password must be at least ${minLength} characters long`,
    };
  }

  if (!hasLetter) {
    return {
      isValid: false,
      message: "Password must contain at least one letter",
    };
  }

  return { isValid: true, message: "" };
};

/**
 * Middleware for Express routes to validate the password in the request body.
 * Returns 400 Bad Request with a clear message if validation fails.
 */
const passwordValidationMiddleware = (req, res, next) => {
  const { password } = req.body;

  // Only validate password if it's provided (e.g., during registration or password update)
  if (password !== undefined) {
    const { isValid, message } = validatePassword(password);
    if (!isValid) {
      return res.status(400).json({ message });
    }
  }

  next();
};

module.exports = {
  validatePassword,
  passwordValidationMiddleware,
};
