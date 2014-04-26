var Grid = (function () {
  'use strict';

  //
  // # Grid
  //
  // The Grid Constructor.
  //
  var Grid = function Grid(delegate, options) {
    // Container element
    this.container = document.getElementsByTagName('body')[0];

    // Spacing between cells, in pixels
    this.gutter = 20;

    // How long to wait for images to load
    this.wait = 10000;

    // Max columns
    this.maxColumns = Infinity;

    // Preload images. If true an element will not be inserted into the grid
    // before all images inside the cell have loaded.
    this.preloadImages = true;

    // Wait for all images to load before layouting?
    this.waitForAll = true;

    if (options) {
      for (var i in options) {
        if (this.hasOwnProperty(i)) {
          this[i] = options[i];
        }
      }
    }

    this.setDelegate(delegate);

    // Internal state
    this.data = [];
    this.items = [];
    this.columns = [];
    this.requiredDelegateMethods = [
      'elementForData',
      'data'
    ];
    this.handlers = {};
    this.active = false;
    this.elementCounter = 0;
    this.elementWidth = 0;
    this.lastAddedIndex = -1;
    this.paddingLeft = 0;
    this.isLoading = false;
    this.scrolling = false;
  };

  //
  // ## Initialize
  //
  // Loads the first batch of data and renders it. Also binds events.
  //
  Grid.prototype.init = function gridInit() {
    // Hook up events
    this.handlers.resize = bindEvent('resize', window, debounce(100, this.resize, this));
    this.handlers.scrolls = bindEvent('scroll', window, throttle(50, this.scroll, this));
    this.handlers.scrolled = bindEvent('scroll', window, debounce(100, this.scrollEnd, this));

    this.active = true;
    this.loadData();
  };

  //
  // ## Deactivate
  //
  // Unbinds handlers. Which makes so that it won't load more data etc.
  //
  Grid.prototype.deactivate = function gridDeactivate() {
    for (var i in this.handlers) {
      unbindEvent(i, window, this.handlers[i]);
    }
  };

  //
  // ## Resize
  //
  // When the window is resized figure out if we need to reflow the content
  // and does that if it has to.
  //
  Grid.prototype.resize = function gridResize() {
    var didChange = this.setupColumns();
    if (!didChange) return;

    var batchSize = 20;
    var batches = Math.ceil(this.items.length / batchSize);
    for (var i = 0; i <= batches; i++) {
      this.layoutCells(this.items.slice(i * batchSize, i * batchSize + batchSize));
    }

    this.callDelegate('didResize', this);
  };

  //
  // ## Handle Scroll
  //
  // Detects the start of scrolling. Calculates whether or not the user reached
  // the bottom and asks the delegate for more content if necessary.
  //
  // Emits the `didStartScroll` event.
  //
  // @TODO: Get actual height of body
  //
  Grid.prototype.scroll = function gridScroll() {
    if (!this.scrolling) {
      this.scrolling = true;
      this.callDelegate('didStartScroll', this);
    }

    var toTop = window.scrollY + 1500; // Hardcoded
    var containerTop = elementTop(this.container);
    var columnLength = Math.max.apply(Math, this.columns);
    if (toTop >= (containerTop + columnLength) + 100) {
      this.loadData();
    }
  };

  //
  // ## Handle Scroll End
  //
  // Detects if scrolling's stopped.
  //
  // Emits the `didEndScroll` event.
  //
  Grid.prototype.scrollEnd = function () {
    this.scrolling = false;
    this.callDelegate('didEndScroll', this);
  };

  //
  // ## Setup Columns
  //
  // Get window width, item width and setup columns.
  //
  // **Returns** false if no layout was needed.
  //
  Grid.prototype.setupColumns = function gridSetupColumns() {
    var columns = [];
    var c = width(this.container);
    var w = this.elementWidth;
    var g = this.gutter;
    var cols = Math.min(Math.floor(c / (w + g)), this.maxColumns);
    if (this.columns.length === cols) return false;

    for (var i = 0; i < cols; i++) {
      columns.push(0);
    }

    this.columns = columns;
    this.paddingLeft = (c - (cols * w) - (cols * g)) / 2;
    return true;
  };

  //
  // ## Load Data
  //
  // Asks the delegate for new data.
  //
  Grid.prototype.loadData = function gridLoad() {
    if (this.isLoading) return;

    var self = this;
    this.isLoading = true;
    this.callDelegate('didStartLoadingData');
    this.callDelegate('data', function (data) {
      self.callDelegate('didFinishLoadingData');
      self.handleData(data, function () {
        self.isLoading = false;
        self.layoutCells.apply(self, arguments);
      });
    });
  };

  //
  // ## Handle Data
  //
  // Handles data and inserts it into the grid.
  //
  Grid.prototype.handleData = function gridHandleData(data, cellsReady) {
    var items = [];
    var len = data.length;
    var frag = document.createDocumentFragment();
    var readyCount = 0;
    var self = this;

    this.data = this.data.concat(data);

    function ready(item) {
      readyCount++;
      self.callDelegate('didLoadImagesForCell', item.element);
      if (!self.elementWidth) {
        self.elementWidth = width(el);
        self.setupColumns();
      }
      frag.appendChild(item.element);

      if (self.waitForAll && readyCount === len) {
        cellsReady(items, frag);
      }
      else if (!self.waitForAll) {
        nextTick(function () { cellsReady([item], frag); });
      }
    }

    var wait = this.wait;
    for (var i = 0; i < len; i++) {
      var el = this.callDelegate('cellForData', data[i], null);
      var item = new Item(el, this.elementCounter++, this.preloadImages, wait, ready);
      this.items.push(item);
      items.push(item);
    }
  };

  //
  // ## Layout Cells
  //
  Grid.prototype.layoutCells = function gridLayout(items, fragment) {
    var len = items.length;
    var p = this.paddingLeft;
    var w = this.elementWidth;
    var g = this.gutter;
    for (var i = 0; i < len; i++) {
      var shortest = this.shortestColumn();
      var left = shortest * w + p + g * (shortest + 0.5);
      var top = this.columns[shortest];
      items[i].element.style.top = top + 'px';
      items[i].element.style.left = left + 'px';
      //items[i].element.style.webkitTransform = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
      var elHeight = height(items[i].element) + this.gutter;
      this.columns[shortest] += elHeight;
    }

    if (fragment) {
      this.container.appendChild(fragment);
    }
  };

  //
  // ## Shortest Column
  //
  // Find the shortest column.
  //
  // **Returns** index of the shortest column.
  //
  Grid.prototype.shortestColumn = function gridShortest() {
    var cols = this.columns;
    var len = cols.length;
    var min = false;
    var shortest = false;
    for (var i = 0; i < len; i++) {
      if (shortest === false || cols[i] < min) {
        min = cols[i];
        shortest = i;
      }
    }

    return shortest;
  };

  //
  // ## Set Delegate
  //
  // Sets the delegate object of the Grid layout.
  //
  Grid.prototype.setDelegate = function gridSetDelegate(delegate) {
    if (typeof delegate !== 'object') throw new Error('Invalid delegate');

    for (var i in this.requiredDelegateMethods) {
      var m = this.requiredDelegateMethods[i];
      if (typeof delegate[m] === 'function') {
        throw new Error('Delegate missing required method: ' + m);
      }
    }

    this.delegate = delegate;
  };

  //
  // ## Call Delegate Method
  //
  // Checks if the delegate calls the given method and calls it if it does.
  // Does not check for required methods being implemented since `setDelegate()`
  // does that up front.
  //
  // * **method**, the string name of the delegate method to call.
  // * **args**, additional arguments to pass to the delegate.
  //
  Grid.prototype.callDelegate = function gridCallDelegate(method) {
    var delegateImplements = typeof this.delegate[method] === 'function';
    if (delegateImplements) {
      var args = Array.prototype.slice.call(arguments, 1);
      return this.delegate[method].apply(this.delegate, args);
    }

    return null;
  };

  // ------------------------------------------------------------------------

  //
  // # Item
  //
  // Represents one item in the grid. Loads all images and calls the ready
  // callback.
  //
  var Item = function Item(element, index, loadImages, wait, ready) {
    this.element = element;
    this.index = index;
    this.timeout = null;

    var self = this;
    var called = false;
    function imageLoaded() {
      count--;
      if (count === 0) {
        clearTimeout(self.timeout);
        if (!called) ready(self);
      }
    }

    if (loadImages) {
      var images = this.element.querySelectorAll('img');
      var count = images.length;

      if (!count) return ready(this);

      bindEvent('load', images, imageLoaded);
      this.timeout = setTimeout(function () {
        unbindEvent('load', images, imageLoaded);
        for (var i = 0; i < count; i++) {
          self.element.removeChild(images[i]);
        }
        called = true;
        ready(self);
      }, wait || 10000);
    }
    else {
      ready(this);
    }
  };

  // ------------------------------------------------------------------------

  // Perform a function on the "nextTick", using rAF if available.
  var nextTick = (window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function (fn) {
        setTimeout(fn, 0);
      }
    );

  // Debounce a function.
  function debounce(wait, fn, context) {
    var timeout;
    return function () {
      var ctx = context  || fn;
      var args = arguments;
      function bounced() {
        fn.apply(context, args);
        clearTimeout(timeout);
      }

      clearTimeout(timeout);
      timeout = setTimeout(bounced, wait);
    };
  }

  // Attach event handler
  function bindEvent(eventName, obj, handler) {
    if (obj && obj.length) {
      for (var i = obj.length - 1; i >= 0; i--) {
        bindEvent(eventName, obj[i], handler);
      }
      return;
    }

    if (window.addEventListener) {
      obj.addEventListener(eventName, handler, false);
    }
    else if (window.attachEventListener) {
      obj.attachEventListener('on' + eventName, handler);
    }

    return handler;
  }

  // Detach event handler
  function unbindEvent(eventName, obj, handler) {
    if (obj && obj.length) {
      for (var i = obj.length - 1; i >= 0; i--) {
        bindEvent(eventName, obj[i], handler);
      }
      return;
    }

    if (window.removeEventListener) {
      obj.removeEventListener(eventName, handler, false);
    }
    else if (window.detachEventListener) {
      obj.detachEventListener('on' + eventName, handler);
    }

    return handler;
  }

  // Get element width
  function width(element) {
    if (!element.parentNode) {
      var style = element.style.display;
      element.style.display = 'hidden';
      document.body.appendChild(element);
      var w = element.offsetWidth;
      document.body.removeChild(element);
      element.style.display = style;
      return w;
    }
    else {
      return element.offsetWidth;
    }
  }

  // Get element height
  function height(element) {
    if (element.parentNode !== document) {
      var e = element.cloneNode(true);
      e.style.display = 'hidden';
      document.body.appendChild(e);
      var h = e.offsetHeight;
      document.body.removeChild(e);
      return h;
    }
    else {
      return element.offsetHeight;
    }
  }

  // Get the relative top position of an element
  function elementTop(element) {
    var curtop = 0;
    if (element.offsetParent) {
      do {
        curtop += element.offsetTop;
      } while ((obj = element.offsetParent));
    }

    return curtop;
  }


  // Throttle function stolen from:
  // http://remysharp.com/2010/07/21/throttling-function-calls/
  function throttle(threshhold, fn, scope) {
    threshhold = threshhold || 250;
    var last,
        deferTimer;
    return function () {
      var context = scope || this;

      var now = new Date().getTime(),
          args = arguments;
      if (last && now < last + threshhold) {
        // hold on to it
        clearTimeout(deferTimer);
        deferTimer = setTimeout(function () {
          last = now;
          fn.apply(context, args);
        }, threshhold);
      } else {
        last = now;
        fn.apply(context, args);
      }
    };
  }

  return Grid;

}());

