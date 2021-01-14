/* global _ */
$(() => {
  let returnValue = [];
  const b = _.indexOf([0, 1], [0, 2]);
  const foo = () => {
    returnValue = [1, 2, b];
    return returnValue;
  };
  $('.slider').slick();
  $('.element').magnigicPopup();
  foo();
  //activate objectfit polyfill
  objectFitImages();
  // eslint-disable-next-line
  const app = new Vue({
    el: '#app'
  });
});
