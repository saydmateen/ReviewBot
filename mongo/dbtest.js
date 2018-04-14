var Store = require('./ReviewStore');

var store = new Store();

setTimeout(() => {
  store.addReview()
}, 2000);