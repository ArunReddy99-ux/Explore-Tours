const mongoose = require('mongoose');

// eslint-disable-next-line import/no-extraneous-dependencies
const slugify = require('slugify');

// const User = require('./userModel');

// eslint-disable-next-line import/no-extraneous-dependencies
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour must have less or equal then 40 charcaters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],
      //   validator: [validator.isAlpha, 'Tour must only contain only characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either:easy,medium,difficlut',
      },
    },
    ratingAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //"this" inly points to current doc on new document craetion
          return val < this.price;
        },
        message: 'Discountprice ({VALUE})must be less the regular  price ',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'Atour must jave image '],
    },
    images: [String],

    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJson
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        //The ref option specifies the model that this field is referring to, in this case, the 'User' model. This establishes a link or reference between the Tour model and the User model.

        // By including ref: 'User', you're telling Mongoose that the guides field is a reference to documents in the 'User' collection. Mongoose uses this information to create a relationship between tours and users.

        // Mongoose doesn't need to import the User model explicitly when setting the ref option. It's not necessary to import the User model into this file because Mongoose uses the string 'User' to infer which collection in the MongoDB database to reference. When you use ref: 'User', Mongoose knows to look for documents in the 'User' collection.
      },
    ],
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
// tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});
//virtual Populate
//we had parent referenced with tours so the reviews know the tours ids but the tours doesnt jnow the reviews ids ,so by child referencing it wolu becone infinte ids to handles for the tours to hamdle so we use the virtual populate method to handle it in the same way as the child  referencing
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});
//Document middleware :runs before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });
// tourSchema.pre('save', function (next) {
//   console.log('Will save document....');
//   next();
// });
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });
//Query middleware
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  // console.log(docs);
  next();
});
//////////////////////////////////////////////////////////////////////////
//Aggregate Middleware
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });
const Tour = mongoose.model('Tour', tourSchema);
module.exports = Tour;
