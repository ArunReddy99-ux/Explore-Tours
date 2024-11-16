const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');

const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res) => {
  //1)Get Tour data from Collection
  const tours = await Tour.find();
  //2)Build template
  //3)Render that template using tour data from (1)
  res.status(200).render('overview', { title: 'All Tours', tours });
});
exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });
  if (!tour) {
    return next(new AppError('There is No Tour with that Name', 404));
  }
  res
    .status(200)
    .set('Content-Security-Policy', "frame-src 'self' https://js.stripe.com")
    .render('tour', { title: `${tour.name} tour`, tour });
});

exports.getLoginForm = (req, res) => {
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      " script-src 'self' https://*.cloudflare.com; script-src-elem 'self' https://*.cloudflare.com https://js.stripe.com",
    )
    .render('login', { title: 'Log into your account' });
};
exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};
exports.getMyTours = catchAsync(async (req, res, next) => {
  //1)find all Bookings
  const bookings = await Booking.find({ user: req.user.id });
  // console.log(bookings);
  //2)find tours with the returned IDS
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });
  // console.log(tours);
  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});
exports.updateUserData = catchAsync(async (req, res, next) => {
  // console.log('User data', req.body);
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );
  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});
