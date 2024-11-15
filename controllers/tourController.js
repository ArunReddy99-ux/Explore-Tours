// eslint-disable-next-line import/no-extraneous-dependencies
const multer = require('multer');
// eslint-disable-next-line import/no-extraneous-dependencies
const sharp = require('sharp');

const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');

const catchAsync = require('../utils/catchAsync');

const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image ! Please upload only images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);
//upload.single('images) req.file
//upload.array('images',5)  req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();
  //1)Cover image
  console.log(req.files);
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);
  //2)Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    }),
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  req.query.fields = 'name,difficulty,duration,summary,ratingAverage,price';
  next();
};

// exports.checkBODY = (req, res, next) => {
//   if (!req.body.name || !req.body.price)
//     return res.status(400).json({
//       status: 'fail',
//       message: 'missing price or name',
//     });
//   next();
// };
//Execute query
// const query = await Tour.find()
//   .where('duration')
//   .equals(5)
//   .where('difficulty')
//   .equals('easy');
// requestedAt: req.requestTime,
// with number of results  we are sending
//in json if we have key and value as same name then we can declare as one tours:tours====>just tours
// const newTour=new Tour({});
// newTour.save();
// we can use tour model directly and call create method on it and into that func we can pass the data that we want to store in database as a new Tour that data comes from post body that stored in side the requet.body  this method return promise and we wait it and store int a new variable taht wold be the new documnet

// res.send('Done');
exports.getAllTours = factory.getAll(Tour);
exports.createTour = factory.createOne(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = Tour.findByIdAndDelete(req.params.id);
//   if (!tour) {
//     return next(new AppError('No tour found with the ID', 404));
//   }
//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: {
        avgPrice: 1,
      },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: {
        numTourStarts: -1,
      },
    },
    {
      $limit: 6,
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  //Mongodb expects radius(distance ) in radians which sholud be calculated by radius /(radius of earth)
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng)
    next(
      new AppError(
        'please provide latitude and longitude in the provided format latlng.',
        404,
      ),
    );
  console.log(distance, lat, lng, unit);
  //geospatial operator like geoWithin finds documensts within a certain geometry and that geometry we have to define we want to documents inside of a sphere of lat and lng of radius of provided distance that we defined
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  //Mongodb expects radius(distance ) in radians which sholud be calculated by radius /(radius of earth)
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng)
    next(
      new AppError(
        'please provide latitude and longitude in the provided format latlng.',
        404,
      ),
    );
  //When you use a $project stage it should typically be the last stage in your pipeline, used to specify which fields to return to the client.Using a $project stage at the beginning or middle of a pipeline to reduce the number of fields passed to subsequent pipeline stages is unlikely to improve performance, as the database performs this optimization automatically.
  const distances = await Tour.aggregate([
    {
      //It must be the first stage and one of our fields must contain geospatial index
      $geoNear: {
        //near is the property from ehich to calculate the distances
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
        spherical: true,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
