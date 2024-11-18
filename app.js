const path = require('path');

const express = require('express');

const morgan = require('morgan');

// eslint-disable-next-line import/no-extraneous-dependencies
const rateLimit = require('express-rate-limit');

// eslint-disable-next-line import/no-extraneous-dependencies
const helmet = require('helmet');

// eslint-disable-next-line import/no-extraneous-dependencies
const mongoSanitise = require('express-mongo-sanitize');

// eslint-disable-next-line import/no-extraneous-dependencies
const xss = require('xss-clean');

// eslint-disable-next-line import/no-extraneous-dependencies
const hpp = require('hpp');

// eslint-disable-next-line import/no-extraneous-dependencies
const cookieParser = require('cookie-parser');
// eslint-disable-next-line import/no-extraneous-dependencies
const compression = require('compression');
// eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
const cors = require('cors');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
// const router = require('./routes/tourRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');

app.set('views', path.join(__dirname, 'views'));
app.use(cors());
app.options('*', cors());
//1)Global Middlewares
app.use(express.static(path.join(__dirname, 'public')));
//Set Security HTTP headers
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'http://127.0.0.1:3000'], // No need for /* after a URL
      connectSrc: ["'self'", 'ws://127.0.0.1:*'], // Allow WebSocket connections on any port for 127.0.0.1
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      scriptSrc: [
        "'self'",
        'https://*.cloudflare.com',
        'https://js.stripe.com',
        // Add other sources as needed
        // 'https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.min.js'
      ],
      frameSrc: ["'self'", 'https://*.stripe.com'],
      objectSrc: ["'none'"],
      styleSrc: ["'self'", 'https:', 'unsafe-inline'],
      upgradeInsecureRequests: [], // Optionally force HTTP to HTTPS for all resources
    },
  }),
);
//Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
//we can define here how many requests for an ip to be allowed for an certain amount of time
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requestd from this ip,please try after some time ',
});
app.use('/api', limiter);

//  BOdy parse,reading data from the body into req,body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

//Data Sanitisatin against NoQuery Injection
app.use(mongoSanitise());

//Data Sanitisation against XSS
app.use(xss());
//preventing parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingAverage',
      'ratingQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);
//Serving Static files
// app.use(express.static(`${__dirname}/public`));
// app.use((req, res, next) => {
//   console.log('Hi from the middleware 👌');
//   next();
// });
// router.param('id');
///Testing Middlewares
app.use(compression());
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

//middleware is a function that can modify the incoming request data .........as it stands between the response and request it is known as middleware
//simply the data from the body is added to request object

//http request
// app.get('/', (req, res) => {
//   res.status(200).json({ message: 'hello from server side!', app: 'Natours' });
// });
// app.post('/', (req, res) => {
//   res.send('You can post to this endpoint.....');
// });

//json==>we have here will be converted to array of javaScript objects

//route handlers

//post request==> we can send  data from client  to server and this data is ideally available on request so request object holds all the data of request/info that was done
//if the request has some data that was sent that data should be on the request but express does not put that body data on the request ....so we have to use middleware
// console.log(req.body);

//data from the body
//body is the property  is available on the request
//when we create an onject we dont create an id, database take cares of it,a new object automatically gets id
//Object.assign which basically alllows to creating a new object by merging a two  existing together
//Routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
// const err = new Error(`cant find ${req.originalUrl} on this server`);
// err.statusCode = 404;
// err.status = 'fail';
//if this if we pass erroe in the next  that would all the middleware in the middle and move to the global error middleware
// next(err);
app.all('*', (req, res, next) => {
  next(new AppError(`cant find ${req.originalUrl} on this server`, 404));
});
app.use(globalErrorHandler);
//////////////////////////////////////////////////////////////////////////
module.exports = app;
