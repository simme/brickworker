# Brickworker

Lays the bricks that are DOM elements in neat arrangements.

## About

Brickworker will help you arrange DOM elements on a page by placing them in
columns. The layout is done using absolute positioning to get the best
performance out of the browsers.

Elements can be arranged in a given number of columns. From Infinity to 1.

## The Delegate

Part of the reason I wanted to reinvent this particular wheel was that I found
the "data layer" handling of the other modules to be — not bad — but not to my
liking.

Hence this module will use the delegate pattern, often found in iOS development,
to drive the datalayer (and to some extend the presentation layer).

## API

To use Brickworker you will have to create yourself a delegate. A delegate is
an object that implements a special set of functions. These functions will be
called by Brickworker to generate the layout.

There are a bunch of functions that the delegate can implement, and a few that
it _has_ to implement.

* `.data(fn)` **required**

  Brickworker will call the `data` function when it needs more data to display.
  For example when the user has scrolled to the bottom of the page. The function
  will recieve a callback. You need to call that callback and give it an array
  of "items" that you want to display in the layout. These "items" are **not**
  DOM elements, but the pure "JSON object" that represents one item in the
  layout.

  If an error happens during the loading of more content it's up to you to
  give Brickworker an empty array and handle the error.

* `.cellForData(data, element)` **required**

  When Brickworker needs to render an element in the viewport it will ask you
  to give it a DOM element for that item. `cellForData` will be passed the
  item's data and _maybe_ an existing DOM element. It's up to you to reset this
  element, or create it, and fill it in with the stuff you want in it. Like
  images and text.

* `.didLoadImagesForCell(element)`

  Brickworker will currently wait for all images in an element before appending
  it to the layout. When all images for a cell has loaded you're given the
  oppurtunity to do something with the element before it's appended.

* `.didStartScroll()` and `.didEndScroll()`

  Called on the delegate when scrolling started or ended.

* `.didResize()`

  Called if the number of columns changes.

* `.didStartLoadingData()`

  Called when loading of data starts, your opportunity to show a spinner etc.

* `.didFinishLoadingData()`

  Called when data was loaded. Now hide the spinner!

* `.didInsertItems(items)`

  Called when new items was inserted (if you want to animate etc).

### Setting up the Brickworker

```javascript
var delegate = // create your delegate
var options = {
  container: document.getElemenentById('myContainer'),
  gutter: 20, // distance between objects
  wait: 10000, // max time to wait for images to load
  maxColumns: Infinity, // maximum number of columns to show
  preloadImages: true, // preload images before inserting into container
  waitForAll: true // wait for all images in a batch to load before inserting
}
var brick = new Brickworker(delegate, options);
```

See examples for more information until I've fixed this.

## No Dependencies

Brickworker does not depend on jQuery or any other lib.

## License

MIT

