import { Request, Response, NextFunction } from 'express';

// Helper function to validate date strings
const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
};

// Simple validation functions to replace Joi
export const validateEvent = (data: any) => {
  const errors: string[] = [];
  
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }
  
  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push('Description is required and must be a non-empty string');
  }
  
  if (!data.category || typeof data.category !== 'string') {
    errors.push('Category is required and must be a string');
  }
  
  if (!data.location || typeof data.location !== 'string' || data.location.trim().length === 0) {
    errors.push('Location is required and must be a non-empty string');
  }
  
  if (!data.start_date || !isValidDate(data.start_date)) {
    errors.push('Start date is required and must be a valid ISO date string');
  }
  
  if (!data.end_date || !isValidDate(data.end_date)) {
    errors.push('End date is required and must be a valid ISO date string');
  }
  
  if (data.start_date && data.end_date && new Date(data.start_date) >= new Date(data.end_date)) {
    errors.push('End date must be after start date');
  }
  
  if (data.max_participants && (!Number.isInteger(Number(data.max_participants)) || Number(data.max_participants) <= 0)) {
    errors.push('Max participants must be a positive integer');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const registrationSchema = {
  validate: (data: any) => {
    const errors: string[] = [];
    
    if (!data.event_id) {
      errors.push('Event ID is required');
    }
    
    if (!data.user_id) {
      errors.push('User ID is required');
    }
    
    return errors.length > 0 ? { error: { details: errors.map(e => ({ message: e })) } } : null;
  }
};

export const feedbackSchema = {
  validate: (data: any) => {
    const errors: string[] = [];
    
    if (!data.feedback || data.feedback.length < 10 || data.feedback.length > 1000) {
      errors.push('Feedback must be between 10 and 1000 characters');
    }
    
    if (!data.user_id) {
      errors.push('User ID is required');
    }
    
    return errors.length > 0 ? { error: { details: errors.map(e => ({ message: e })) } } : null;
  }
};

// Validation middleware factory
export const validate = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.validate(req.body);
    
    if (result && result.error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.details.map((detail: any) => ({
          message: detail.message
        }))
      });
    }
    
    next();
  };
};
