#!/usr/bin/env node
'use strict';

const logger = require('./logger');
const { isObject, get } = require('lodash');

class AppError extends Error {
  constructor(message, statusCode, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode || 500;
    this.code = code || 'INTERNAL_SERVER_ERROR';
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = {
  // Create a new application error
  createError: (message, statusCode, code, details) => {
    return new AppError(message, statusCode, code, details);
  },

  // Handle operational errors
  handleError: (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log the error
    logger.error(`${err.statusCode || 500} - ${err.message}`, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      stack: err.stack,
      details: err.details,
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
      const message = 'Validation failed';
      const errors = Object.values(err.errors).map((e) => e.message);
      error = new AppError(message, 400, 'VALIDATION_ERROR', { errors });
    }

    if (err.name === 'CastError') {
      const message = `Invalid ${err.path}: ${err.value}`;
      error = new AppError(message, 400, 'INVALID_INPUT');
    }

    if (err.code === 11000) {
      const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
      const message = `Duplicate field value: ${value}. Please use another value!`;
      error = new AppError(message, 400, 'DUPLICATE_KEY');
    }

    if (err.name === 'JsonWebTokenError') {
      const message = 'Invalid token. Please log in again!';
      error = new AppError(message, 401, 'INVALID_TOKEN');
    }

    if (err.name === 'TokenExpiredError') {
      const message = 'Your token has expired! Please log in again.';
      error = new AppError(message, 401, 'TOKEN_EXPIRED');
    }

    // Send error response
    res.status(error.statusCode || 500).json({
      status: 'error',
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Something went wrong!',
      details: error.details || {},
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  },

  // Handle unhandled promise rejections
  handleRejections: () => {
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(err.name, err);
      // Close server & exit process
      server.close(() => {
        process.exit(1);
      });
    });
  },

  // Handle uncaught exceptions
  handleExceptions: () => {
    process.on('uncaughtException', (err) => {
      logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
      logger.error(err.name, err);
      process.exit(1);
    });
  },

  // Handle 404 errors
  notFound: (req, res, next) => {
    const error = new AppError(
      `Can't find ${req.originalUrl} on this server!`,
      404,
      'RESOURCE_NOT_FOUND'
    );
    next(error);
  },

  // Validate request body against Joi schema
  validateRequest: (schema, property = 'body') => {
    return (req, res, next) => {
      const { error } = schema.validate(req[property], {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        return next(
          new AppError(
            'Validation failed',
            400,
            'VALIDATION_ERROR',
            { errors }
          )
        );
      }

      next();
    };
  },

  // Check if the error is operational
  isOperationalError: (error) => {
    if (error instanceof AppError) return error.isOperational;
    return false;
  },
};

module.exports = {
  AppError,
  ...errorHandler,
};

// Usage example:
// const { createError, handleError } = require('./errorHandler');
// throw createError('Resource not found', 404, 'NOT_FOUND');
