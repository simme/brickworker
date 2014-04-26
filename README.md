# Grid Layout

Self contained object handling a grid layout.

## Goals

* Responsive
    * Layout when resize is done
* Fast
    * Optimizes DOM manipulation, minifies paints/layouts
* Leaves data fetching to implementor
    * Provides hooks for adding data to the layout
    * Provides hooks for creating the list elements

## Delegate

Methods fired on the delegate.

### Scrolling & Resizing

Allows for disabling hover etc during scroll if the delegate wants to.

* didStartScroll
* didEndScroll
* didResize

### Cells

Allows the delegate to customize elements put into the grid.

* cellForData(data, element)

  Recieves the data object for the given cell. If a reusable element exists
  this will be passed to this function. Make sure to reset stuff.

* didLoadImagesForCell(cell)

  If `preloadImages` is set to true this will be called on the delegate when
  all images have loaded.

### Data

Allows the delegate to provide data for the grid.

* data

  Called on the delegate when the grid needs more data to render. This method
  should always return an _array_ of data objects.

* didStartLoadingData
* didFinishLoadingData

  Called when data has been processed and we're starting to add elements to the
  DOM.

