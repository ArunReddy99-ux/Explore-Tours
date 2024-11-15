const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid  ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Duplicate value field ${value} please use another value `;
  return new AppError(message, 400);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input Data ${errors.join('. ')}`;
  return new AppError(message, 400);
};
const handleJWTError = () =>
  new AppError('Invalid token .Please login again ', 401);
const handleJWTExpiredError = () =>
  new AppError('Your token has expired .Please log in again', 401);
const sendErrorDev = (err, req, res) => {
  //A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  //B) RENDERS WEBSITE
  console.log('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong !',
    msg: err.message,
  });
};
const sendErrorProd = (err, req, res) => {
  //A)API
  if (req.originalUrl.startsWith('/api')) {
    //A)Operational,trusted error:send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    //B)   1)log errror
    console.error(' ERROR 🎆 ', err);
    //2)send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong',
    });
  }
  //B) RENDERED WEBSITE
  //A) OPERATIONAL,TRUSTED ERROR:SEND MESSAGE TO CLIENT
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong !',
      msg: err.message,
    });
  }
  console.error(' ERROR 🎆', err);
  //2)send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong !',
    msg: 'Please try again Later',
  });
};
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // eslint-disable-next-line no-self-assign
  err.message = err.message;

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.create(err);

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
  next();
};
