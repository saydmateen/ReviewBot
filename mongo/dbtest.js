var Store = require('./ReviewStore');

var store = new Store();

setTimeout(() => {
  store.addReview({
    passed: false,
    ticket: "BPY-7",
    comment: "Code does not compile",
    email: "first.last@powerschool.com"
  });

  setTimeout(() => {
    store.getAllItems().then(items => {
      console.log("All: " + JSON.stringify(items));
    });
  }, 2000);

  setTimeout(() => {
    store.getReviewedItems().then(items => {
      console.log("Reviewed: " + JSON.stringify(items));
    });
  }, 2000);

  setTimeout(() => {
    store.getUnreviewedItems().then(items => {
      console.log("Needs Review: " + JSON.stringify(items));
    });
  }, 2000);
}, 2000);

