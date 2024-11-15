const crypto = require('crypto');

const { promisify } = require('util');

const jwt = require('jsonwebtoken');

const User = require('../models/userModel');

const catchAsync = require('../utils/catchAsync');

const AppError = require('../utils/appError');

const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    //THIS REFERS WE CANNOT MANIPULATE THE COOKIE EVEN DESTROY or DELETE IT
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // const newUser = await User.create(req.body);
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangeAt: req.body.passwordChangeAt,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  // const url = `${req.protocol}://${req.get('host')}/me`;
  // // console.log(url);
  // await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1)check the email and password is exist
  if (!email || !password) {
    return next(new AppError('Please provide Email and Password', 400));
  }

  //2)check if user exists and the password is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password', 401));
  }
  // console.log(user);
  //3)if everything oh send token to client
  createSendToken(user, 200, req, res);
});
// Then How do we log out if the cookie cant be deleted or manipulated ,
//simple send back a cookie with a same name without token  that will overide the cuurent cookie in the browser that the one without the token ,that cookie when sended without token considered as logout
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};
exports.protect = catchAsync(async (req, res, next) => {
  //1)Getting token and check if the token is there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in!Please log in to access', 401),
    );
  }
  //2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3)check if user still exits
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists', 401),
    );
  }
  //4)checkif user changed password after the tokenwas issued
  if (currentUser.passwordChangedAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed the password .Please login in again',
        401,
      ),
    );
  }
  //Granted acess to the protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});
//Onnly for rendered pages
exports.isLoggedIn = async (req, res, next) => {
  //1)Getting token and check if the token is there
  if (req.cookies.jwt) {
    try {
      //1)Verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      //2)check if user still exits
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //4)checkif user changed passwordafetr the tokenwas issued
      if (currentUser.passwordChangedAfter(decoded.iat)) {
        return next();
      }
      //THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    //roles['admin','lead-guide'].role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You dont have permissions to delete the tour', 403),
      );
    }
    next();
  };
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  //1)Get user based on the Posted email
  if (!user) {
    return next(
      new AppError('There is no user with the email u have provided', 404),
    );
  }
  //2)Generate The random reset Token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  //3)send it to User'semail

  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.createPasswordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email .try again later',
        500,
      ),
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //2)if token has not expired ,and there is a  user ,set the new password
  if (!user) {
    return next(new AppError('Token is invalid or expired'));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3)Update ChangepasswordAt property for the user
  //4)Log the user in,send JWT
  createSendToken(user, 200, req, res);
});
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)Get user from the collection
  const user = await User.findById(req.user.id).select('+password');
  //2)check the password is valid
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }
  //3)update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //User.findbyidAndUpdate will not work as intended

  //4)log user in,send JWT
  createSendToken(user, 200, req, res);
});
