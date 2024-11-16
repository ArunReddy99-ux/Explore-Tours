/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51QFsbaBm5fmzJ8oN0LuFx9nOT64PJP1drgioLJVCYwww0ejhGhwRpWdBhehipHoJt3GfjqYK69QDszoWrZl6tvQF00QN9Z0d1F',
);

export const bookTour = async (tourId) => {
  //1) Get checkout session fron  Api
  try {
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    //2) Create checkout form +chance credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    showAlert('error', err);
  }
};
